import type { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  getTopupOrderByPayload,
  getTopupOrderForCheckout,
  listBroadcastChatIds,
  markBotChatBlocked,
  upsertBotChat,
} from '../supabaseStore.js';
import {
  PRE_CHECKOUT_DEADLINE_MS,
  answerPreCheckoutQuery,
  confirmStarsPayment,
  parseTopupPayload,
} from '../payments/deposit/index.js';
import {
  miniAppUrl,
  telegramJsonMethod,
  verifyAdminSecret,
} from './helpers.js';
import {
  approveLoginChallenge,
  parseWebLoginStartPayload,
  WEB_LOGIN_START_PREFIX,
  webAppPublicUrl,
} from '../payments/webLogin/telegramChallenge.js';

const TELEGRAM_WEBHOOK_SECRET_TOKEN = String(process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ?? '').trim();

function verifyWebhookSecret(req: FastifyRequest): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET_TOKEN) return true;
  const got = String(req.headers['x-telegram-bot-api-secret-token'] ?? '').trim();
  const expected = TELEGRAM_WEBHOOK_SECRET_TOKEN;
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function evaluatePreCheckoutQuery(q: any) {
  const fromId = Number(q?.from?.id);
  if (!Number.isFinite(fromId) || fromId <= 0) {
    return { ok: false as const, error_message: 'Не удалось определить покупателя.' };
  }
  if (q?.currency !== 'XTR') {
    return { ok: false as const, error_message: 'Поддерживаются только Telegram Stars (XTR).' };
  }

  const payload = String(q?.invoice_payload ?? '');
  let parsed: { userId: number; packageId: string };
  try {
    parsed = parseTopupPayload(payload);
  } catch {
    return { ok: false as const, error_message: 'Некорректный счёт. Запросите новый.' };
  }
  if (parsed.userId !== fromId) {
    return { ok: false as const, error_message: 'Счёт выписан для другого пользователя.' };
  }

  const row = await getTopupOrderForCheckout(payload, fromId);

  if (!row || row.status !== 'pending') {
    return { ok: false as const, error_message: 'Счёт не найден или уже обработан.' };
  }
  if (row.package_id !== parsed.packageId || Number(q.total_amount) !== row.xtr_amount) {
    return { ok: false as const, error_message: 'Сумма счёта не совпадает с пакетом.' };
  }
  return { ok: true as const };
}

async function handlePreCheckoutQuery(q: any) {
  const qid = String(q?.id ?? '');
  if (!qid) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ kind: 'timeout' }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'timeout' }), PRE_CHECKOUT_DEADLINE_MS);
  });
  const evalPromise = evaluatePreCheckoutQuery(q).then(
    (evaluation) => ({ kind: 'eval' as const, evaluation }),
    (err) => ({ kind: 'error' as const, err }),
  );

  const winner = await Promise.race([timeoutPromise, evalPromise]);
  if (timer) clearTimeout(timer);

  if (winner.kind === 'timeout') {
    await answerPreCheckoutQuery(qid, false, {
      error_message: 'Не удалось подтвердить заказ вовремя. Попробуйте снова.',
    }).catch(() => undefined);
    return;
  }
  if (winner.kind === 'error') {
    await answerPreCheckoutQuery(qid, false, { error_message: 'Ошибка проверки заказа.' }).catch(
      () => undefined,
    );
    return;
  }
  if (!winner.evaluation.ok) {
    await answerPreCheckoutQuery(qid, false, {
      error_message: winner.evaluation.error_message,
    }).catch(() => undefined);
    return;
  }
  await answerPreCheckoutQuery(qid, true).catch(() => undefined);
}

async function applySuccessfulPayment(sp: any, payerTelegramId: number) {
  const payload = String(sp?.invoice_payload ?? '');
  const chargeId = String(sp?.telegram_payment_charge_id ?? '');
  const providerChargeId = sp?.provider_payment_charge_id ? String(sp.provider_payment_charge_id) : null;
  const totalAmount = Number(sp?.total_amount);
  const currency = String(sp?.currency ?? '');
  if (!payload || !chargeId || currency !== 'XTR' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return;
  }

  let parsed: { userId: number; packageId: string };
  try {
    parsed = parseTopupPayload(payload);
  } catch {
    return;
  }
  if (parsed.userId !== payerTelegramId) {
    return;
  }

  // Prefer Deposit Service; falls back to legacy topup_orders inside confirmStarsPayment
  const order = await getTopupOrderByPayload(payload);
  if (order) {
    if (order.status === 'paid') return;
    if (order.user_id !== payerTelegramId) return;
    if (order.package_id !== parsed.packageId || order.xtr_amount !== totalAmount) return;
  }

  await confirmStarsPayment({
    payload,
    chargeId,
    providerChargeId,
    totalAmountXtr: totalAmount,
    payerTelegramId,
  });
}

async function handleBotStartMessage(message: any) {
  const chat = message?.chat;
  const from = message?.from;
  const chatId = Number(chat?.id);
  const userId = Number(from?.id);
  if (!Number.isFinite(chatId) || chatId === 0 || !Number.isFinite(userId) || userId <= 0) return;
  if (chat?.type && chat.type !== 'private') return;

  await upsertBotChat({
    chatId,
    userId,
    username: from?.username ?? null,
    firstName: from?.first_name ?? null,
  }).catch((err) => {
    console.warn('[bot_chats] upsert failed', err);
  });

  const textRaw = String(message?.text ?? '').trim();
  const challengeId = parseWebLoginStartPayload(textRaw);

  // ── Web browser login via /start web_<challenge> ──────────────────────────
  if (challengeId) {
    const photo =
      Array.isArray(from?.photo) && from.photo.length
        ? null // widget uses photo_url; bot API doesn't give URL here
        : null;
    const result = await approveLoginChallenge(challengeId, {
      id: userId,
      username: from?.username ?? null,
      firstName: from?.first_name ?? null,
      avatar: photo,
    }).catch((err) => {
      console.warn('[web-login] approve failed', err);
      return { ok: false as const, reason: 'error' };
    });

    const site = webAppPublicUrl();
    const returnUrl = site
      ? `${site}/?auth=tg&c=${encodeURIComponent(challengeId)}`
      : null;

    if (result.ok) {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text:
          `✅ <b>Вход подтверждён</b>\n\n` +
          `Вернитесь на сайт Metaluck — сессия откроется автоматически.`,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };
      if (returnUrl) {
        body.reply_markup = {
          inline_keyboard: [[{ text: '🌐 Открыть сайт', url: returnUrl }]],
        };
      }
      await telegramJsonMethod('sendMessage', body).catch((err) => {
        console.warn('[web-login] confirm send failed', err);
      });
      return;
    }

    await telegramJsonMethod('sendMessage', {
      chat_id: chatId,
      text:
        result.reason === 'expired'
          ? '⏰ Ссылка для входа устарела. Вернитесь на сайт и нажмите «Войти через Telegram» снова.'
          : 'Не удалось подтвердить вход. Попробуйте ещё раз с сайта.',
      parse_mode: 'HTML',
    }).catch(() => undefined);
    return;
  }

  // Ignore other start payloads that look like web_ but failed parse
  if (textRaw.includes(WEB_LOGIN_START_PREFIX) && textRaw.startsWith('/start')) {
    await telegramJsonMethod('sendMessage', {
      chat_id: chatId,
      text: 'Некорректная ссылка входа. Откройте сайт и нажмите «Войти через Telegram» заново.',
    }).catch(() => undefined);
    return;
  }

  const appUrl = miniAppUrl();
  const name = String(from?.first_name ?? '').trim() || 'друг';
  const text =
    `Привет, ${name}! 👋\n\n` +
    `Добро пожаловать в <b>Metaluck</b> — кейсы, мини-игры и Stars.\n` +
    `Нажми кнопку ниже, чтобы открыть приложение.`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (appUrl) {
    body.reply_markup = {
      inline_keyboard: [[{ text: '🎮 Играть', url: appUrl }]],
    };
  }
  await telegramJsonMethod('sendMessage', body).catch((err) => {
    console.warn('[bot] welcome send failed', err);
  });
}

async function handleMyChatMember(update: any) {
  const chatId = Number(update?.chat?.id);
  const status = String(update?.new_chat_member?.status ?? '');
  if (!Number.isFinite(chatId) || chatId === 0) return;
  if (status === 'kicked' || status === 'left') {
    await markBotChatBlocked(chatId, true).catch(() => undefined);
  } else if (status === 'member' || status === 'restricted') {
    await markBotChatBlocked(chatId, false).catch(() => undefined);
  }
}

export function registerTelegramRoutes(app: FastifyInstance) {
  app.get('/api/telegram/webhook', async () => ({
    ok: true,
    hint: 'Telegram sends POST updates here.',
  }));

  app.post('/api/telegram/webhook', async (req, reply) => {
    if (!verifyWebhookSecret(req)) {
      return reply.status(403).send({ message: 'Invalid webhook secret' });
    }

    const update = (req.body ?? {}) as any;
    if (update.pre_checkout_query) {
      await handlePreCheckoutQuery(update.pre_checkout_query);
      return reply.send({ ok: true });
    }
    if (update.message?.successful_payment) {
      const payerId = Number(update.message?.from?.id);
      if (Number.isFinite(payerId) && payerId > 0) {
        await applySuccessfulPayment(update.message.successful_payment, payerId);
      }
      return reply.send({ ok: true });
    }

    const text = String(update.message?.text ?? '').trim();
    if (text === '/start' || text.startsWith('/start ')) {
      await handleBotStartMessage(update.message);
      return reply.send({ ok: true });
    }
    if (update.my_chat_member) {
      await handleMyChatMember(update.my_chat_member);
      return reply.send({ ok: true });
    }
    return reply.send({ ok: true });
  });

  /** Admin broadcast to everyone who pressed /start. Header: x-admin-secret */
  app.post('/api/admin/broadcast', async (req, reply) => {
    if (!verifyAdminSecret(req)) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    const body = (req.body ?? {}) as { text?: string; button?: string; dryRun?: boolean; limit?: number };
    const text = String(body.text ?? '').trim();
    if (!text || text.length > 3900) {
      return reply.status(400).send({ message: 'text required (1–3900 chars)' });
    }
    const dryRun = Boolean(body.dryRun);
    const buttonLabel = String(body.button ?? 'Играть').trim() || 'Играть';
    const limit = Math.min(20_000, Math.max(1, Number(body.limit) || 5000));
    const chatIds = await listBroadcastChatIds(limit);
    const appUrl = miniAppUrl();
    const replyMarkup = appUrl
      ? { inline_keyboard: [[{ text: buttonLabel, url: appUrl }]] }
      : undefined;

    if (dryRun) {
      return reply.send({ ok: true, dryRun: true, recipients: chatIds.length });
    }

    let sent = 0;
    let failed = 0;
    let blocked = 0;
    for (const chatId of chatIds) {
      try {
        await telegramJsonMethod('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        const msg = String((err as Error)?.message ?? err);
        if (/blocked|deactivated|chat not found|Forbidden/i.test(msg)) {
          blocked += 1;
          await markBotChatBlocked(chatId, true).catch(() => undefined);
        }
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    return reply.send({ ok: true, recipients: chatIds.length, sent, failed, blocked });
  });
}
