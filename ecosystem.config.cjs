module.exports = {
  apps: [
    {
      name: 'minigames',
      script: 'server/dist/index.js',
      cwd: 'C:/Users/Admin/Desktop/minigames',
      env: {
        NODE_ENV: 'production',
        TELEGRAM_BOT_TOKEN: '8380194542:AAHOgPIpowIPctTvRLlAn1Esz3dKd_jZQoA',
      },
    },
    {
      name: 'minigames-tunnel',
      script: 'C:/Program Files/Git/usr/bin/bash.exe',
      args: ['C:/Users/Admin/Desktop/minigames/start-tunnel.sh'],
      autorestart: true,
      restart_delay: 5000,
    },
    {
      name: 'minigames-url-watcher',
      script: 'C:/Program Files/Git/usr/bin/bash.exe',
      args: ['C:/Users/Admin/Desktop/minigames/update-tunnel-url.sh'],
      autorestart: true,
    },
  ],
};
