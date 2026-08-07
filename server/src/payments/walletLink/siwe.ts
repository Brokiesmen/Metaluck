/**
 * Проверка владения EVM-адресом (EIP-191 personal_sign).
 * Клиент подписывает выданное нами сообщение с nonce; сервер восстанавливает
 * адрес через viem.verifyMessage. Полноценный SIWE не требуется — только линк.
 */

import { verifyMessage, isAddress, getAddress } from 'viem';
import { allowedProofDomains } from './tonProof.js';

export interface EvmProofPayload {
  address: string; // 0x… (заявленный)
  message: string; // подписанный текст (содержит nonce + address + domain)
  signature: string; // 0x…
  nonce: string; // наш challenge (должен встречаться в message)
}

export interface VerifiedEvmWallet {
  address: string; // lowercase 0x… (для хранения / unique)
  addressDisplay: string; // checksummed 0x…
}

/** Шаблон сообщения для линка EVM-кошелька (клиент строит идентично). */
export function buildEvmLinkMessage(opts: {
  address: string;
  nonce: string;
  domain: string;
  issuedAt: string;
}): string {
  return [
    'Metaluck: link this wallet to your account.',
    '',
    `Address: ${getAddress(opts.address)}`,
    `Domain: ${opts.domain}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${opts.issuedAt}`,
    '',
    'Signing is free and does not authorize any transaction.',
  ].join('\n');
}

/** Сообщение для входа через EVM (WalletConnect / MetaMask). */
export function buildEvmLoginMessage(opts: {
  address: string;
  nonce: string;
  domain: string;
  issuedAt: string;
}): string {
  return [
    'Metaluck: sign in with this wallet.',
    '',
    `Address: ${getAddress(opts.address)}`,
    `Domain: ${opts.domain}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${opts.issuedAt}`,
    '',
    'Signing is free and does not authorize any transaction.',
  ].join('\n');
}

export async function verifyEvmProof(input: EvmProofPayload): Promise<VerifiedEvmWallet> {
  const address = String(input.address ?? '').trim();
  if (!isAddress(address)) throw new Error('bad address');
  if (!input.message || !input.signature) throw new Error('malformed proof');

  // nonce должен присутствовать в подписанном сообщении (защита от подмены).
  if (!input.nonce || !input.message.includes(input.nonce)) {
    throw new Error('nonce mismatch');
  }
  // адрес должен присутствовать в сообщении (checksummed).
  if (!input.message.includes(getAddress(address))) {
    throw new Error('address mismatch');
  }
  // домен из сообщения должен быть в списке разрешённых.
  const domainLine = input.message.split('\n').find((l) => l.startsWith('Domain: '));
  const domain = domainLine ? domainLine.slice('Domain: '.length).trim().toLowerCase() : '';
  if (!allowedProofDomains().has(domain)) {
    throw new Error(`domain not allowed: ${domain}`);
  }

  const ok = await verifyMessage({
    address: getAddress(address),
    message: input.message,
    signature: input.signature as `0x${string}`,
  });
  if (!ok) throw new Error('invalid signature');

  return { address: address.toLowerCase(), addressDisplay: getAddress(address) };
}
