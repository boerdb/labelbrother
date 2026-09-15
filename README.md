# BrotherDruk

Installbare **Next.js PWA** om labels te ontwerpen (tekst, vormen, icons) en af te drukken op een **Brother QL-820NWB(c)** op het thuisnetwerk.

Standaard printer: `192.168.1.215` (TCP poort **9100**). Standaard label: **85×62 mm** ontwerp op **DK-22205** (62 mm doorlopend, RollW62) — zelfde instelling als [`C:\DEV\etiketten`](C:\DEV\etiketten): vóór print **90° gedraaid** naar 62×85 mm op de rol (954×696 px ontwerp → 696×954 px print).

## Productie (NEXT-server + PM2)

Zie **[docs/DEPLOY.md](docs/DEPLOY.md)** — poort **3022**, pad `/var/www/labelbrother`, geen Docker.

```bash
python scripts/deploy_git_init.py   # eerste keer
python scripts/deploy_pull.py       # updates
```

App: **https://brother.clvs.nl**

## Snel starten (lokaal op je PC — dev)

```powershell
cd C:\DEV\brotherdruk
$env:PRINTER_HOST="192.168.1.215"
$env:PRINTER_PORT="9100"
npm run dev
```

De terminal **blijft open** en lijkt te “hangen” — dat is goed: de server wacht op verzoeken. Open **http://localhost:8443** in Chrome of Edge.

## Snel starten (Docker, optioneel)

```bash
docker compose up --build
```

Open daarna **https://\<docker-host\>:8443** (bijv. `https://192.168.1.10:8443`).

Bij eerste start maakt de container een **self-signed** TLS-certificaat aan. Vertrouw dat certificaat één keer op pc, tablet en iPhone, anders blokkeert Safari de PWA / service worker.

### Omgevingsvariabelen

| Variabele | Default | Betekenis |
|-----------|---------|-----------|
| `PRINTER_HOST` | `192.168.1.215` | IP van de labelprinter |
| `PRINTER_PORT` | `9100` | Raw print poort |
| `DEFAULT_LABEL` | `29x90` | Labelformaat-id |
| `API_KEY` | leeg | Optionele beveiliging (`X-API-Key` header) |
| `PORT` | `8443` | HTTPS-poort van de app |
| `SSL_KEY` / `SSL_CERT` | `/certs/*.pem` | Pad naar TLS-bestanden |

### Printer bereikbaar vanuit Docker (Windows)

Docker Desktop kan meestal het LAN (`192.168.x.x`) bereiken. Lukt afdrukken niet:

- Controleer firewall en dat de printer wakker is (niet in diepe slaap).
- Op Linux/NAS: overweeg `network_mode: host` in `docker-compose.yml`.

## Lokaal ontwikkelen (zonder Docker)

```bash
npm install
npm run dev -w web
```

Zonder certificaat in `web/certs/` draait de dev-server op **HTTP** (zelfde poort **8443**). Voor HTTPS lokaal:

```bash
mkdir web/certs
mkcert -install
mkcert -key-file web/certs/key.pem -cert-file web/certs/cert.pem brotherdruk.local localhost 127.0.0.1
```

Stel printer in via omgevingsvariabelen:

```powershell
$env:PRINTER_HOST="192.168.1.215"
$env:PRINTER_PORT="9100"
npm run dev -w web
```

## Printer (eenmalig)

1. **Editor Lite uit** (fysieke knop, niet in het LCD-menu): op de QL-820NWB(c) zit een **Editor Lite-knop** met een **groen lampje**. Houd die knop ingedrukt tot het **groene lampje uit** is. Brandt het lampje, dan staat Editor Lite aan (vooral problematisch via USB).
2. Laad de juiste rol (**DK-22205**, 62 mm doorlopend — niet 29×90 die-cut).
3. In de app: knop **Status** om media/te bereikbaarheid te testen.

## API

| Endpoint | Methode | Body |
|----------|---------|------|
| `/api/print` | POST | `{ "labelSize": "85x62", "image": "<base64 png>" }` |
| `/api/status` | GET | Printerstatus |
| `/api/media` | GET | Beschikbare labelformaten (MVP: 85×62 / DK-22205) |

Met `API_KEY` gezet: header `X-API-Key: …` of `Authorization: Bearer …`.

## PWA op iPhone / Android

1. Open de **https://** URL in Safari / Chrome op hetzelfde WiFi.
2. **Toevoegen aan beginscherm**.
3. Optionele API-sleutel invullen onder **Instellingen** in de app.

Offline: assets worden gecached; **afdrukken vereist netwerk**.

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| Geen print / timeout | Editor Lite uit; ping `192.168.1.215`; poort 9100 open |
| Certificaat-waarschuwing | Self-signed cert accepteren of mkcert gebruiken |
| 401 Unauthorized | `API_KEY` in Docker en dezelfde sleutel in app-instellingen |
| Verkeerde labelgrootte | Rol in printer moet overeenkomen met gekozen formaat |
| Wit label / leeg | Tekst/zwarte elementen gebruiken; wit canvas blijft blank |

## Techniek

- **Next.js 15** (App Router) + **react-konva** editor
- Print via [`@thermal-label/brother-ql-node`](https://thermal-label.github.io/brother-ql/node) (raster → TCP 9100)
- PWA via **Serwist**
