const base = process.env.API || 'http://127.0.0.1:3001';

async function req(path, opts = {}) {
  const { headers: userHeaders, ...rest } = opts;
  const r = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(userHeaders || {}),
    },
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  console.log(path, r.status, JSON.stringify(json).slice(0, 200));
  return { status: r.status, json };
}

const h = { 'X-Telegram-Init-Data': '' };

const st = await req('/api/blackjack/state', { headers: h });
if (st.json?.round?.phase === 'player') {
  const fin = await req('/api/blackjack/stand', {
    method: 'POST',
    headers: h,
    body: '{}',
  });
  if (fin.status !== 200) {
    console.error('stand to clear active round failed', fin.json);
    process.exit(1);
  }
}

const d = await req('/api/blackjack/deal', {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ bet: 10 }),
});
if (d.status !== 200) process.exit(1);
const r = d.json?.round;
if (!r || r.phase !== 'player') {
  console.log('deal: expected phase player');
  process.exit(1);
}
const hit = await req('/api/blackjack/hit', {
  method: 'POST',
  headers: h,
  body: '{}',
});
if (hit.status !== 200) {
  console.error('HIT FAILED', hit.json);
  process.exit(1);
}
console.log('OK hit');
