/**
 * PM2 — Label Printer / labelbrother op poort 3022 (server NEXT)
 *
 * Printerinstellingen en geheimen (zoals BROTHER_PASSWORD) staan in
 * .env.production en .env.local; web/server.mjs leest die bij elke start zelf
 * in. Na een wijziging is dus een gewone `pm2 restart labelbrother` genoeg.
 */
module.exports = {
  apps: [
    {
      name: "labelbrother",
      cwd: "/var/www/labelbrother",
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3022",
        HOSTNAME: "0.0.0.0",
        TZ: "Europe/Amsterdam",
      },
    },
  ],
};
