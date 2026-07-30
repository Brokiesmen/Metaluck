import os from 'node:os';

const PORT = Number(process.env.VITE_PORT ?? process.env.CLIENT_PORT ?? 5173);

function isLanIPv4(address) {
  if (!address || address.includes(':')) return false;
  if (address.startsWith('127.')) return false;
  if (address.startsWith('169.254.')) return false;
  // VirtualBox host-only, Hamachi-like ranges — не Wi‑Fi роутера
  if (address.startsWith('192.168.56.')) return false;
  if (address.startsWith('26.')) return false;
  return (
    address.startsWith('192.168.') ||
    address.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

const ips = new Set();
for (const iface of Object.values(os.networkInterfaces())) {
  for (const addr of iface ?? []) {
    if (addr.family === 'IPv4' && isLanIPv4(addr.address)) {
      ips.add(addr.address);
    }
  }
}

console.log('\n📶 Wi‑Fi / LAN (откройте на телефоне в той же сети):');
if (ips.size === 0) {
  console.log('   (не найден LAN IPv4 — проверьте Wi‑Fi)');
} else {
  for (const ip of [...ips].sort()) {
    console.log(`   http://${ip}:${PORT}/`);
  }
}
console.log('   API проксируется через Vite (/api → :3001)\n');
