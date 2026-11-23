import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * De .env-bestanden staan in de hoofdmap van de repo (één map boven web/),
 * waar Next ze zelf niet ziet. Daarom lezen we ze hier bij elke start in,
 * net zoals Next dat doet: wat al in de omgeving staat gaat voor, en
 * .env.local gaat voor .env.production / .env. Een gewone `pm2 restart`
 * pakt zo altijd de nieuwste waarden op.
 */
function loadRootEnv() {
  const root = join(__dirname, "..");
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  const files = [".env.local", `.env.${mode}`, ".env"];
  for (const file of files) {
    const filePath = join(root, file);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
loadRootEnv();

const port = parseInt(process.env.PORT ?? "8443", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

function loadTls() {
  const keyPath = process.env.SSL_KEY ?? join(__dirname, "certs", "key.pem");
  const certPath = process.env.SSL_CERT ?? join(__dirname, "certs", "cert.pem");
  if (!existsSync(keyPath) || !existsSync(certPath)) {
    return null;
  }
  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}

await app.prepare();

const tls = loadTls();
const onRequest = (req, res) => handle(req, res);

const localUrl = `http://localhost:${port}`;

if (tls) {
  createHttpsServer(tls, onRequest).listen(port, hostname, () => {
    console.log("");
    console.log("  Label Printer draait (HTTPS)");
    console.log(`  Open in browser: https://localhost:${port}`);
    console.log("  Stoppen: Ctrl+C in deze terminal");
    console.log("");
  });
} else {
  createHttpServer(onRequest).listen(port, hostname, () => {
    console.log("");
    console.log("  Label Printer draait — dit is normaal; de terminal blijft open.");
    console.log(`  Open in browser: ${localUrl}`);
    console.log("  Printer (optioneel): $env:PRINTER_HOST=\"192.168.1.215\"");
    console.log("  Docker is niet nodig voor lokaal gebruik.");
    console.log("  Stoppen: Ctrl+C");
    console.log("");
  });
}
