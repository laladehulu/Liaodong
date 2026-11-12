// Liaodong relay: a Cloudflare Worker + one Durable Object per room. Every player opens a WebSocket to
//   wss://<worker>/room/<CODE>?id=<peer id>
// and the room passes messages between the players in it. No accounts, no secrets: the page needs only the address.
// Frames are JSON arrays of messages, so a client sends one frame per tick however many players it talks to:
//   client -> room : [{ to, k, d }]         k: 'open' | 'ack' | 'data' | 'close'
//   room -> client : [{ from, k, d }]       plus { k: 'err', type } and { k: 'gone', from } when a player drops
const MAX_PLAYERS = 16, MAX_FRAME = 1 << 20;

export class Room {
  constructor(state) { this.state = state; }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 });
    const id = new URL(req.url).searchParams.get('id') || '';
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    const refuse = (type) => { server.accept(); server.send(JSON.stringify([{ k: 'err', type }])); server.close(4000, type); return new Response(null, { status: 101, webSocket: client }); };
    if (!/^[\w-]{1,64}$/.test(id)) return refuse('bad-id');
    if (this.state.getWebSockets(id).length) return refuse('unavailable-id');
    if (this.state.getWebSockets().length >= MAX_PLAYERS) return refuse('room-full');
    this.state.acceptWebSocket(server, [id]); // hibernation API: the room sleeps between messages, so idle rooms cost nothing
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_FRAME) return;
    const from = this.state.getTags(ws)[0]; let arr; try { arr = JSON.parse(msg); } catch (e) { return; }
    if (!Array.isArray(arr)) return;
    const out = new Map(), back = [];
    for (const m of arr) {
      if (!m || typeof m.to !== 'string') continue;
      const t = this.state.getWebSockets(m.to)[0];
      if (!t) { if (m.k === 'open') back.push({ k: 'err', type: 'peer-unavailable', to: m.to }); continue; }
      let q = out.get(t); if (!q) out.set(t, q = []); q.push({ from, k: m.k, d: m.d });
    }
    for (const [t, q] of out) try { t.send(JSON.stringify(q)); } catch (e) { }
    if (back.length) try { ws.send(JSON.stringify(back)); } catch (e) { }
  }
  async webSocketClose(ws) { this.gone(ws); try { ws.close(); } catch (e) { } }
  async webSocketError(ws) { this.gone(ws); }
  gone(ws) { const from = this.state.getTags(ws)[0]; const f = JSON.stringify([{ k: 'gone', from }]); for (const o of this.state.getWebSockets()) if (o !== ws) try { o.send(f); } catch (e) { } }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    // only the game's own pages may use the relay (and the downloaded .html, whose origin is "null")
    const ok = !origin || (env.ALLOWED || '').split(',').some(a => a && (origin === a.trim() || (a.trim().endsWith('*') && origin.startsWith(a.trim().slice(0, -1)))));
    if (!ok) return new Response('origin not allowed', { status: 403 });
    const m = /^\/room\/([A-Za-z0-9]{3,12})$/.exec(url.pathname);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase())).fetch(req);
    return new Response('liaodong relay ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  },
};
