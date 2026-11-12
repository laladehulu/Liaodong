# Liaodong relay server

A tiny Cloudflare Worker that passes game messages between the players in a room over WebSockets.
It connects on any network that can load a web page, so it fixes the routers where peer-to-peer fails.
It has no secrets and no accounts. On Cloudflare's free plan, hitting the daily limit only pauses it until
the next day (the game then falls back to peer-to-peer), so there is never a bill.

## Deploy (one time, about 5 minutes)

1. Make a free account at https://dash.cloudflare.com/sign-up
2. Install Node.js (https://nodejs.org) if you don't have it.
3. In a terminal, from this `relay/` folder:
   ```
   npx wrangler login      # opens the browser: click Allow
   npx wrangler deploy
   ```
   The first deploy asks you to pick a workers.dev subdomain if you have none yet.
4. It prints an address like `https://liaodong-relay.<your-subdomain>.workers.dev`.
   Opening it in a browser should show `liaodong relay ok`.
5. Put it in `src/net.js` as `const RELAY_URL = 'wss://liaodong-relay.<your-subdomain>.workers.dev';`
   (note `wss://`), rebuild and publish.

Test without editing anything: add `?relay=wss://liaodong-relay.<your-subdomain>.workers.dev` to the game's address
(every player needs it). `?p2p=1` forces the old peer-to-peer path.

## Limits

Free plan: 100,000 Durable Object requests a day; WebSocket messages count 20 to 1, and each client sends
one frame per tick (~30 a second), so roughly 9 hours of 2-player or 4–5 hours of 4-player battles a day.
`ALLOWED` in wrangler.toml lists the origins that may use it (the GitHub Pages site and downloaded .html files).
