// ===== P2P networking (PeerJS mesh) + deterministic lockstep =====
const PREFIX = 'mingwar1619-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode() { let s = ''; for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }

class Net {
  constructor() {
    this.peer = null; this.conns = {}; this.isHost = false; this.players = []; this.myIdx = -1; this.myCfg = null; this.code = ''; this.started = false;
    this.onLobby = null; this.onStart = null; this.onInput = null; this.onHash = null; this.onPeerLeft = null; this.onFail = null; this.onChat = null;
  }
  static available() { return typeof Peer !== 'undefined' && typeof RTCPeerConnection !== 'undefined'; }
  host(cfg, cb) {
    const code = genCode(); this.code = code; this.isHost = true; this.myIdx = 0; this.myCfg = cfg;
    this.players = [{ id: 'self', idx: 0, cfg, connected: true }];
    let peer;
    try { peer = new Peer(PREFIX + code, { debug: 0 }); } catch (e) { cb(e); return; }
    this.peer = peer;
    peer.on('open', (id) => { this.players[0].id = id; cb(null, code); this.pingTimer = setInterval(() => { if (this.started) { clearInterval(this.pingTimer); return; } this.broadcast({ t: 'ping', ts: performance.now() }); }, 2000); });
    peer.on('error', (e) => { if (e.type === 'unavailable-id') { try { peer.destroy(); } catch (_) { } this.host(cfg, cb); } else cb(e); });
    peer.on('connection', (conn) => this.acceptConn(conn));
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (_) { } });
  }
  join(code, cfg, cb) {
    this.code = code; this.isHost = false; this.myCfg = cfg;
    let peer; try { peer = new Peer({ debug: 0 }); } catch (e) { cb(e); return; }
    this.peer = peer; let done = false;
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      const timer = setTimeout(() => { if (!done) { done = true; cb(new Error('No answer from that room code. Check the code and that the host is still in the lobby.')); } }, 12000);
      this.wire(conn, () => { if (!done) { done = true; clearTimeout(timer); cb(null); } });
    });
    peer.on('error', (e) => { if (!done) { done = true; cb(new Error(e.type === 'peer-unavailable' ? 'Room not found. Check the code.' : (e.message || String(e)))); } });
    peer.on('connection', (conn) => this.acceptConn(conn));
  }
  acceptConn(conn) {
    if (this.started && this.isHost) { conn.on('open', () => { try { conn.send({ t: 'reject' }); } catch (_) { } setTimeout(() => conn.close(), 800); }); return; }
    this.wire(conn, null);
  }
  wire(conn, onOpen) {
    conn.on('open', () => {
      this.conns[conn.peer] = conn;
      if (this.isHost) {
        const idx = this.players.length;
        this.players.push({ id: conn.peer, idx, cfg: null, connected: true });
        conn.send({ t: 'welcome', idx, players: this.players.map(p => ({ id: p.id, idx: p.idx, cfg: p.cfg })) });
        this.broadcast({ t: 'join', id: conn.peer, idx }, conn.peer);
        this.onLobby && this.onLobby();
      } else if (this.myIdx >= 0) {
        conn.send({ t: 'cfg', idx: this.myIdx, cfg: this.myCfg });
      }
      onOpen && onOpen();
    });
    conn.on('data', (d) => this.onData(conn, d));
    conn.on('close', () => this.onClose(conn.peer));
    conn.on('error', (e) => { console.warn('conn error', e); });
  }
  playerByPeer(id) { return this.players.find(p => p.id === id); }
  onData(conn, m) {
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'welcome': {
        this.myIdx = m.idx;
        this.players = m.players.map(p => ({ id: p.id, idx: p.idx, cfg: p.cfg, connected: true }));
        const me = this.players.find(p => p.idx === this.myIdx); if (me) { me.id = 'self'; me.cfg = this.myCfg; }
        const hostP = this.players.find(p => p.idx === 0); if (hostP) hostP.id = conn.peer;
        conn.send({ t: 'cfg', idx: this.myIdx, cfg: this.myCfg });
        for (const p of this.players) {
          if (p.idx === 0 || p.idx === this.myIdx) continue;
          const c = this.peer.connect(p.id, { reliable: true, serialization: 'json' }); this.wire(c, null);
        }
        this.onLobby && this.onLobby(); break;
      }
      case 'join': { if (!this.players.find(p => p.idx === m.idx)) this.players.push({ id: m.id, idx: m.idx, cfg: null, connected: true }); this.onLobby && this.onLobby(); break; }
      case 'cfg': {
        let p = this.players.find(p => p.idx === m.idx);
        if (!p) { p = { id: conn.peer, idx: m.idx, cfg: null, connected: true }; this.players.push(p); }
        p.id = conn.peer; p.cfg = m.cfg;
        if (this.isHost) this.broadcast({ t: 'pcfg', idx: m.idx, cfg: m.cfg }, conn.peer);
        this.onLobby && this.onLobby(); break;
      }
      case 'pcfg': { const p = this.players.find(p => p.idx === m.idx); if (p) p.cfg = m.cfg; this.onLobby && this.onLobby(); break; }
      case 'start': { this.started = true; this.onStart && this.onStart(m); break; }
      case 'i': { this.onInput && this.onInput(m.p, m.k, m.d); break; }
      case 'h': { this.onHash && this.onHash(m.p, m.k, m.h); break; }
      case 'chat': { this.onChat && this.onChat(m.p, m.s); break; }
      case 'ping': { try { conn.send({ t: 'pong', ts: m.ts }); } catch (e) { } break; }
      case 'pong': { const p = this.playerByPeer(conn.peer); if (p) p.rtt = Math.round(performance.now() - m.ts); this.onLobby && this.onLobby(); break; }
      case 'reject': { this.onFail && this.onFail('That battle has already started.'); break; }
    }
  }
  broadcast(m, except) { for (const id in this.conns) { if (id === except) continue; try { this.conns[id].send(m); } catch (e) { } } }
  onClose(peerId) {
    const p = this.playerByPeer(peerId); delete this.conns[peerId];
    if (p) { p.connected = false; this.onPeerLeft && this.onPeerLeft(p.idx); }
    this.onLobby && this.onLobby();
  }
  sendCfg(cfg) { this.myCfg = cfg; const me = this.players.find(p => p.idx === this.myIdx); if (me) me.cfg = cfg; if (this.myIdx >= 0) this.broadcast({ t: 'cfg', idx: this.myIdx, cfg }); }
  start(msg) { this.started = true; this.broadcast(msg); this.onStart && this.onStart(msg); }
  sendInput(tick, data) { this.broadcast({ t: 'i', p: this.myIdx, k: tick, d: data }); }
  sendHash(tick, h) { this.broadcast({ t: 'h', p: this.myIdx, k: tick, h }); }
  sendChat(s) { this.broadcast({ t: 'chat', p: this.myIdx, s }); }
  destroy() { clearInterval(this.pingTimer); try { this.peer && this.peer.destroy(); } catch (e) { } }
}

// Lockstep: every peer sends its input for tick (t + delay) while executing tick t.
// A tick only executes once every connected player's input for it has arrived.
class Lockstep {
  constructor(n, me, delay) {
    this.n = n; this.me = me; this.delay = delay; this.tick = 0; this.buf = new Map(); this.connected = new Array(n).fill(true);
    this.hashes = new Map(); this.desync = false; this.desyncTick = -1; this.stalledSince = 0;
    for (let t = 0; t < delay; t++) { const a = this.get(t); for (let p = 0; p < n; p++) a[p] = 0; }
  }
  get(t) { let a = this.buf.get(t); if (!a) { a = new Array(this.n).fill(undefined); this.buf.set(t, a); } return a; }
  ready(t) { const a = this.get(t); for (let p = 0; p < this.n; p++) if (this.connected[p] && a[p] === undefined) return false; return true; }
  waitingOn(t) { const a = this.get(t); const out = []; for (let p = 0; p < this.n; p++) if (this.connected[p] && a[p] === undefined) out.push(p); return out; }
  queueLocal(inp) { const t = this.tick + this.delay; this.get(t)[this.me] = inp; return t; }
  onRemote(p, t, d) { if (t < this.tick) return; this.get(t)[p] = d; }
  inputsFor(t) { const a = this.get(t); for (let p = 0; p < this.n; p++) if (a[p] === undefined) a[p] = 0; return a; }
  advance() { this.buf.delete(this.tick - 3); this.tick++; }
  disconnect(p) { this.connected[p] = false; }
  recordHash(p, t, h) {
    let m = this.hashes.get(t); if (!m) { m = new Array(this.n).fill(undefined); this.hashes.set(t, m); }
    m[p] = h;
    let all = true, ref;
    for (let i = 0; i < this.n; i++) { if (!this.connected[i]) continue; if (m[i] === undefined) { all = false; break; } if (ref === undefined) ref = m[i]; else if (m[i] !== ref) { this.desync = true; this.desyncTick = t; } }
    if (all) this.hashes.delete(t);
    for (const k of this.hashes.keys()) if (k < t - 600) this.hashes.delete(k);
  }
}
