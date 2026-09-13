# BrotherDruk deployen (Next + PM2, geen Docker)

Zelfde aanpak als Rekenmachine / Scheikunde / VVH-js.

## Architectuur

- **Next.js** op server **NEXT** (`192.168.1.32`) → `/var/www/labelbrother` → poort **3022**
- **PM2** procesnaam: `labelbrother`
- GitHub: `git@github.com:boerdb/labelbrother.git` (branch `main`)
- **Geen Docker** — Node draait de app; print gaat vanaf de server naar de Brother op `192.168.1.215:9100` (zelfde LAN)

```
Telefoon/PC → http://192.168.1.32:3022 → Next.js (PM2)
                              ↓
                    Brother QL-820 @ 192.168.1.215:9100
```

De NEXT-server moet de printer op het thuisnetwerk kunnen bereiken (meestal wel als `.32` en `.215` op `192.168.1.x` zitten).

## Eerste installatie

Vanaf je PC (in `C:\DEV\brotherdruk`):

```bash
python scripts/deploy_git_init.py
```

Of handmatig op de server:

```bash
cd /var/www
git clone git@github.com:boerdb/labelbrother.git labelbrother
cd labelbrother
cp .env.production.example .env.production
# pas PRINTER_HOST aan indien nodig
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

## Updates

```bash
python scripts/deploy_pull.py
```

Of op de server:

```bash
cd /var/www/labelbrother
git pull
npm ci
npm run build
pm2 restart labelbrother --update-env
```

## Controle

```bash
pm2 list | grep labelbrother
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3022/
curl -s http://127.0.0.1:3022/api/status
```

App: **http://192.168.1.32:3022**

## PWA / HTTPS

Achter nginx met TLS (zoals je andere apps) kun je later een vhost toevoegen. Voor LAN-test volstaat poort 3022.

## Docker (optioneel, lokaal)

`docker-compose.yml` is alleen bedoeld voor wie Docker op een andere machine gebruikt — **niet nodig** op de NEXT-server met PM2.
