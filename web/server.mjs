import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";

const __dirname = dirname(fileURLToPath(import.meta.url));
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
    console.log("  BrotherDruk draait (HTTPS)");
    console.log(`  Open in browser: https://localhost:${port}`);
    console.log("  Stoppen: Ctrl+C in deze terminal");
    console.log("");
  });
} else {
  createHttpServer(onRequest).listen(port, hostname, () => {
    console.log("");
    console.log("  BrotherDruk draait — dit is normaal; de terminal blijft open.");
    console.log(`  Open in browser: ${localUrl}`);
    console.log("  Printer (optioneel): $env:PRINTER_HOST=\"192.168.1.215\"");
    console.log("  Docker is niet nodig voor lokaal gebruik.");
    console.log("  Stoppen: Ctrl+C");
    console.log("");
  });
}
