/** PM2 — BrotherDruk / labelbrother op poort 3022 (server NEXT) */
const fs = require("fs");
const path = require("path");

function loadEnvFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = {
  ...loadEnvFile(".env.production"),
  ...loadEnvFile(".env.local"),
};

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
        PRINTER_HOST: "192.168.1.215",
        PRINTER_PORT: "9100",
        PRINTER_DEVICE_KEY: "QL_820NWBc",
        DEFAULT_LABEL: "85x62",
        TZ: "Europe/Amsterdam",
        ...fileEnv,
      },
    },
  ],
};
