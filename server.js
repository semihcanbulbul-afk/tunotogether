const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT || 3000);
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const MODES = ["Standard", "Brutal", "Double Side", "Party", "Fast", "Standart", "Acımasız", "Çift Taraf", "Parti", "Hızlı"];
const LANGS = new Set(['en']);
const AVATARS = new Set(["aria.svg","atlas.svg","dylan.svg","ethan.svg","iris.svg","leo.svg","luna.svg","man.svg","mason.svg","mia.svg","moonbyte.svg","noah.svg","nova.svg","pixel.svg","raven.svg","selena.svg","violet.svg","woman.svg","zen.svg","custom.svg"]);
const rooms = new Map();
const requestBuckets = new Map();
const chatCooldowns = new Map();
const CHAT_UPLOAD_DIR = path.join(__dirname, 'uploads', 'chat');
const CHAT_IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg', signature: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', signature: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/gif': { ext: 'gif', signature: (b) => b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii')) },
  'image/webp': { ext: 'webp', signature: (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' }
};
const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

const MESSAGES = {
  tr: {
    roomGone: 'Bu oda artık mevcut değil.', noNewPlayers: 'Bu oda artık yeni oyuncu kabul etmiyor.', roomFull: n => `Oda dolu. Bu oda ${n} oyuncu için oluşturuldu.`,
    invalidIdentity: 'Oda kimliği geçersiz.', onlyHost: 'Sadece oda sahibi modu değiştirebilir.', invalidMode: 'Geçersiz oyun modu.', onlyHostKick: 'Sadece oda sahibi oyuncu çıkarabilir.', playerNotFound: 'Oyuncu bulunamadı.', emptyMessage: 'Mesaj boş olamaz.', chatRateLimited: 'Bir sonraki mesajı göndermeden önce biraz bekle.', onlyHostStart: 'Oyunu sadece oda sahibi başlatabilir.',
    capacityRange: (min,max)=>`Oda kapasitesi ${min} ile ${max} oyuncu arasında olmalı.`, invalidImage:'5 MB boyutuna kadar PNG, JPEG, GIF veya WebP fotoğrafı yükleyebilirsin.', startHost:'Odadaki bir oyuncu masaüstü uygulamasını henüz indirmedi. Tüm oyuncular uygulamayı indirdikten sonra oyun başlatılabilir.', startPlayer:'Oyunun başlatılabilmesi için odadaki tüm oyuncuların masaüstü uygulamasını indirmesi gerekiyor. Uygulamanı indirip ardından tekrar hazır ol.',
    allDownloaded:'Tüm oyuncular uygulamayı indirmiş durumda. Play Uno masaüstü uygulamasını açarak oyuna devam edebilirsin.', minimumPlayers:'Oyunu başlatmak için odada en az iki oyuncu olmalı.', everyoneReady:'Oyunu başlatmak için odadaki herkes hazır olmalı.', voiceTitle:'Sesli Sohbet İçin Uygulama Gerekli', voiceMessage:'Sesli sohbeti kullanabilmek için Play Uno masaüstü uygulamasını indirmen gerekiyor.'
  },
  en: {
    roomGone:'This room no longer exists.', noNewPlayers:'This room is no longer accepting new players.', roomFull:n=>`The room is full. This room was created for ${n} players.`, invalidIdentity:'Invalid room identity.', onlyHost:'Only the room owner can change the mode.', invalidMode:'Invalid game mode.', onlyHostKick:'Only the room owner can remove players.', playerNotFound:'Player not found.', emptyMessage:'Message cannot be empty.', chatRateLimited:'Please wait a moment before sending another message.', onlyHostStart:'Only the room owner can start the game.', capacityRange:(min,max)=>`Room capacity must be between ${min} and ${max} players.`, invalidImage:'Upload a PNG, JPEG, GIF or WebP image up to 5 MB.', startHost:'A player in the room has not downloaded the desktop app yet. The game can start after everyone downloads it.', startPlayer:'The game cannot start until every player in the room has downloaded the desktop app. Download the app and then get ready again.', allDownloaded:'Everyone has downloaded the app. Open the Play Uno desktop app to continue.', minimumPlayers:'At least two players must be in the room to start.', everyoneReady:'Everyone in the room must be ready before starting.', voiceTitle:'Desktop App Required for Voice Chat', voiceMessage:'You need the Play Uno desktop app to use voice chat.'
  },
  de: {
    roomGone:'Dieser Raum existiert nicht mehr.', noNewPlayers:'Dieser Raum nimmt keine neuen Spieler mehr auf.', roomFull:n=>`Der Raum ist voll. Dieser Raum wurde für ${n} Spieler erstellt.`, invalidIdentity:'Ungültige Raum-ID.', onlyHost:'Nur der Raum-Besitzer kann den Modus ändern.', invalidMode:'Ungültiger Spielmodus.', onlyHostKick:'Nur der Raum-Besitzer kann Spieler entfernen.', playerNotFound:'Spieler nicht gefunden.', emptyMessage:'Die Nachricht darf nicht leer sein.', chatRateLimited:'Bitte warte kurz, bevor du die nächste Nachricht sendest.', onlyHostStart:'Nur der Raum-Besitzer kann das Spiel starten.', capacityRange:(min,max)=>`Die Raumkapazität muss zwischen ${min} und ${max} Spielern liegen.`, invalidImage:'Lade ein PNG-, JPEG-, GIF- oder WebP-Bild bis 5 MB hoch.', startHost:'Ein Spieler im Raum hat die Desktop-App noch nicht heruntergeladen. Das Spiel kann starten, sobald alle sie heruntergeladen haben.', startPlayer:'Das Spiel kann erst starten, wenn alle Spieler im Raum die Desktop-App heruntergeladen haben. Lade die App herunter und werde danach wieder bereit.', allDownloaded:'Alle Spieler haben die App heruntergeladen. Öffne die Play Uno Desktop-App, um fortzufahren.', minimumPlayers:'Zum Starten müssen mindestens zwei Spieler im Raum sein.', everyoneReady:'Vor dem Start müssen alle Spieler bereit sein.', voiceTitle:'Desktop-App für Sprachchat erforderlich', voiceMessage:'Du benötigst die Play Uno Desktop-App für den Sprachchat.'
  }
};
function getLang(){return 'en';}
function msg(_lang,key,...args){const value=MESSAGES.en[key] ?? MESSAGES.tr[key] ?? key;return typeof value==='function'?value(...args):value;}


const BLOCKED_INSTALLER_HASH = '3afb535b6d015932641f78de816d47240e07ea95c03642cfc11e7c45f6af1730';
const PRIVATE_FILES = new Set(['/.htaccess', '/server.js', '/package.json', '/package-lock.json', '/readme-tr.txt', '/deploy-tr.txt', '/start.bat', '/downloads/readme.txt', '/changelog-tr.md', '/unoplay-setup-1.0.0.exe']);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: "20kb" }));
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > 180) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
  if (requestBuckets.size > 5000) {
    for (const [ip, item] of requestBuckets) {
      if (now - item.start > 120_000) requestBuckets.delete(ip);
      if (requestBuckets.size <= 4000) break;
    }
  }
  res.set('Cache-Control', 'no-store');
  next();
});
async function sendInstaller(req, res) {
  const fs = require('fs');
  let targetFile = path.join(__dirname, 'UnoPlay-Setup-100.zip');
  if (!fs.existsSync(targetFile)) {
    try {
      const files = fs.readdirSync(__dirname);
      const exe = files.find(f => (f.toLowerCase().endsWith('.exe') || f.toLowerCase().endsWith('.zip')) && !['cloudflared.exe', 'node.exe'].includes(f.toLowerCase()));
      if (exe) targetFile = path.join(__dirname, exe);
    } catch {}
  }
  if (!fs.existsSync(targetFile)) {
    return res.status(404).send('Installer file is not uploaded yet. Place your .exe in the project folder.');
  }
  const fileName = path.basename(targetFile);
  if (req.method === 'HEAD') {
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).end();
  }
  res.download(targetFile, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(err.code === 'ENOENT' ? 404 : 500).send('Could not serve installer file.');
    }
  });
}
app.get([
  '/download',
  '/download.php',
  '/UnoPlay-Setup-100.zip',
  /^\/downloads\/Uno-Setup-1\.0\.0(?:%20|\s+)?(?:\(1\))?\.exe$/i
], sendInstaller);
// Keep server and deployment files out of the public static-file surface.
app.use((req, res, next) => {
  let pathname;
  try { pathname = decodeURIComponent(req.path || '').replace(/\\/g, '/').toLowerCase(); }
  catch { return res.sendStatus(400); }
  if (PRIVATE_FILES.has(pathname) || pathname === '/node_modules' || pathname.startsWith('/node_modules/')) return res.sendStatus(404);
  next();
});
app.use('/uploads/chat', express.static(CHAT_UPLOAD_DIR, { dotfiles: 'deny', fallthrough: true, maxAge: '1h', immutable: true }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

app.get('/health', (_req,res)=>res.json({ok:true,service:'play-uno'}));

app.get("/room", (_req, res) => res.sendFile(path.join(__dirname, "room", "index.html")));
app.get("/room/", (_req, res) => res.sendFile(path.join(__dirname, "room", "index.html")));

function normalizeCode(value) {
  return String(value || "").replace(/^#?UNO-/i, "").trim().toUpperCase();
}

function createRoomCode() {
  let result;
  do {
    result = String(crypto.randomInt(1000, 10000));
  } while (rooms.has(result));
  return result;
}

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function cleanName(value, fallback = "Oyuncu") {
  const name = String(value || "").trim().slice(0, 24);
  return name || fallback;
}

function cleanAvatar(value, fallback = "aria.svg") {
  const avatar = String(value || fallback).trim().slice(0, 40);
  return AVATARS.has(avatar) ? avatar : fallback;
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    isHost: player.isHost,
    isReady: player.isReady,
    downloaded: Boolean(player.downloaded)
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    players: room.players.map(publicPlayer)
  };
}

function getRoom(value) {
  return rooms.get(normalizeCode(value));
}

function findPlayer(room, token) {
  return room?.players.find((player) => player.token === token);
}

function requirePlayer(req, res) {
  const room = getRoom(req.params.code);

  if (!room) {
    res.status(404).json({ error: msg(req.query?.lang || req.headers['accept-language'],'roomGone') });
    return null;
  }

  let player = findPlayer(room, req.body?.token);

  const headerToken = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!player) player = findPlayer(room, headerToken);

  if (!player) {
    res.status(401).json({ error: msg(req.body?.lang,'invalidIdentity') });
    return null;
  }

  player.lastSeen = Date.now();
  return { room, player };
}

function removeChatImage(message) {
  const match = /^\/uploads\/chat\/([a-f0-9]{32}\.(?:jpg|png|gif|webp))$/.exec(message?.imageUrl || '');
  if (match) fsPromises.unlink(path.join(CHAT_UPLOAD_DIR, match[1])).catch(() => {});
}
function pushRoomMessage(room, message) {
  room.messages.push(message);
  while (room.messages.length > 100) removeChatImage(room.messages.shift());
}
function clearRoomImages(room) {
  for (const message of room.messages) removeChatImage(message);
}
function addSystem(room, message) {
  pushRoomMessage(room, { id: crypto.randomUUID(), name: 'Play Uno', message, system: true, time: Date.now() });
}

function broadcast(room) {
  io.to(room.code).emit("room:state", {
    room: publicRoom(room),
    messages: room.messages
  });
}

app.post("/api/rooms", (req, res) => {
  const name = cleanName(req.body.name);
  const avatar = cleanAvatar(req.body.avatar);
  const mode = MODES.includes(req.body.mode) ? req.body.mode : "Standart";
  const maxPlayers = Number(req.body.maxPlayers);

  if (!Number.isInteger(maxPlayers) || maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) {
    return res.status(400).json({
      error: msg(req.body?.lang,'capacityRange',MIN_PLAYERS,MAX_PLAYERS)
    });
  }

  const roomCode = createRoomCode();
  const playerId = crypto.randomUUID();
  const playerToken = createToken();

  const player = {
    id: playerId,
    token: playerToken,
    name,
    avatar,
    isHost: true,
    isReady: false,
    downloaded: false,
    lastSeen: Date.now()
  };

  const room = {
    code: roomCode,
    mode,
    status: "waiting",
    hostId: playerId,
    maxPlayers,
    players: [player],
    messages: []
  };

  rooms.set(roomCode, room);

  return res.json({
    room: publicRoom(room),
    identity: { playerId, token: playerToken }
  });
});

app.post("/api/rooms/:code/join", (req, res) => {
  const room = getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({ error: msg(req.body?.lang,'roomGone') });
  }

  if (room.status !== "waiting") {
    return res.status(409).json({ error: msg(req.body?.lang,'noNewPlayers') });
  }

  if (room.players.length >= room.maxPlayers) {
    return res.status(409).json({
      error: msg(req.body?.lang,'roomFull',room.maxPlayers)
    });
  }

  const name = cleanName(req.body.name);
  const avatar = cleanAvatar(req.body.avatar, "atlas.svg");
  const playerId = crypto.randomUUID();
  const playerToken = createToken();

  room.players.push({
    id: playerId,
    token: playerToken,
    name,
    avatar,
    isHost: false,
    isReady: false,
    downloaded: false,
    lastSeen: Date.now()
  });

  addSystem(room, `${name} odaya katıldı.`);
  broadcast(room);

  return res.json({
    room: publicRoom(room),
    identity: { playerId, token: playerToken }
  });
});

app.get("/api/rooms/:code/state", (req, res) => {
  const room = getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({ error: msg(req.query?.lang || req.headers['accept-language'],'roomGone') });
  }

  const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!findPlayer(room, token)) {
    return res.status(401).json({ error: msg(req.query.lang, 'invalidIdentity') });
  }

  res.set('Cache-Control', 'no-store');
  return res.json({
    room: publicRoom(room),
    messages: room.messages
  });
});

app.post("/api/rooms/:code/ready", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  result.player.isReady = !result.player.isReady;
  broadcast(result.room);

  return res.json({ room: publicRoom(result.room) });
});

app.post("/api/rooms/:code/mode", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  if (!result.player.isHost) {
    return res.status(403).json({ error: msg(req.body?.lang,'onlyHost') });
  }

  if (!MODES.includes(req.body.mode)) {
    return res.status(400).json({ error: msg(req.body?.lang,'invalidMode') });
  }

  result.room.mode = req.body.mode;
  addSystem(result.room, `Oyun modu ${result.room.mode} olarak ayarlandı.`);
  broadcast(result.room);

  return res.json({ room: publicRoom(result.room) });
});

app.post("/api/rooms/:code/profile", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  result.player.name = cleanName(req.body.name);
  result.player.avatar = cleanAvatar(req.body.avatar);
  result.player.lastSeen = Date.now();
  broadcast(result.room);

  return res.json({ room: publicRoom(result.room) });
});

app.post("/api/rooms/:code/downloaded", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  result.player.downloaded = true;
  result.player.lastSeen = Date.now();
  broadcast(result.room);

  return res.json({ room: publicRoom(result.room) });
});

app.post("/api/rooms/:code/chat", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  const message = String(req.body.message || "").trim().slice(0, 500);

  if (!message) {
    return res.status(400).json({ error: msg(req.body?.lang,'emptyMessage') });
  }

  const cooldownKey = `${result.room.code}:${result.player.id}`;
  const now = Date.now();
  if (now - (chatCooldowns.get(cooldownKey) || 0) < 900) {
    return res.status(429).json({ error: msg(req.body?.lang, 'chatRateLimited') });
  }
  chatCooldowns.set(cooldownKey, now);

  const chatMessage = {
    id: crypto.randomUUID(),
    name: result.player.name,
    message,
    time: Date.now()
  };

  pushRoomMessage(result.room, chatMessage);

  io.to(result.room.code).emit("room:chat", chatMessage);

  return res.json({ ok: true });
});

app.post('/api/rooms/:code/chat-image', express.raw({ type: Object.keys(CHAT_IMAGE_TYPES), limit: MAX_CHAT_IMAGE_BYTES }), async (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;
  const mime = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const imageType = CHAT_IMAGE_TYPES[mime];
  const bytes = req.body;
  if (!imageType || !Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_CHAT_IMAGE_BYTES || !imageType.signature(bytes)) {
    return res.status(400).json({ error: msg(req.query?.lang, 'invalidImage') });
  }

  const cooldownKey = `${result.room.code}:${result.player.id}`;
  const now = Date.now();
  if (now - (chatCooldowns.get(cooldownKey) || 0) < 900) {
    return res.status(429).json({ error: msg(req.query?.lang, 'chatRateLimited') });
  }

  const filename = `${crypto.randomBytes(16).toString('hex')}.${imageType.ext}`;
  try {
    await fsPromises.mkdir(CHAT_UPLOAD_DIR, { recursive: true });
    await fsPromises.writeFile(path.join(CHAT_UPLOAD_DIR, filename), bytes, { flag: 'wx' });
  } catch {
    return res.status(500).json({ error: 'Could not save the image. Please try again.' });
  }

  chatCooldowns.set(cooldownKey, now);
  const chatMessage = { id: crypto.randomUUID(), name: result.player.name, message: '', imageUrl: `/uploads/chat/${filename}`, time: now };
  pushRoomMessage(result.room, chatMessage);
  io.to(result.room.code).emit('room:chat', chatMessage);
  return res.json({ ok: true, message: chatMessage });
});

app.post("/api/rooms/:code/kick", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  if (!result.player.isHost) {
    return res.status(403).json({ error: msg(req.body?.lang,'onlyHostKick') });
  }

  const target = result.room.players.find((player) => player.id === req.body.playerId);

  if (!target || target.id === result.player.id) {
    return res.status(400).json({ error: msg(req.body?.lang,'playerNotFound') });
  }

  result.room.players = result.room.players.filter((player) => player.id !== target.id);
  chatCooldowns.delete(`${result.room.code}:${target.id}`);

  for (const socket of io.sockets.sockets.values()) {
    if (
      socket.data.roomCode === result.room.code &&
      socket.data.playerId === target.id
    ) {
      socket.emit("room:kicked");
      socket.disconnect(true);
    }
  }

  addSystem(result.room, `${target.name} odadan çıkarıldı.`);
  broadcast(result.room);

  return res.json({ room: publicRoom(result.room) });
});

app.post("/api/rooms/:code/leave", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  result.room.players = result.room.players.filter(
    (player) => player.id !== result.player.id
  );
  chatCooldowns.delete(`${result.room.code}:${result.player.id}`);

  if (result.player.isHost && result.room.players[0]) {
    result.room.players[0].isHost = true;
    result.room.hostId = result.room.players[0].id;
  }

  if (!result.room.players.length) {
    clearRoomImages(result.room);
    rooms.delete(result.room.code);
    return res.json({ ok: true });
  }

  addSystem(result.room, `${result.player.name} odadan ayrıldı.`);
  broadcast(result.room);

  return res.json({ ok: true });
});

app.post("/api/rooms/:code/start", (req, res) => {
  const result = requirePlayer(req, res);
  if (!result) return;

  if (!result.player.isHost) {
    return res.status(403).json({ error: msg(req.body?.lang,'onlyHostStart') });
  }

  let reason = '';
  if (result.room.players.length < MIN_PLAYERS) reason = 'minimumPlayers';
  else if (result.room.players.some((player) => !player.isReady)) reason = 'everyoneReady';
  else if (result.room.players.some((player) => !player.downloaded)) reason = 'startHost';

  if (reason) {
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.roomCode !== result.room.code) continue;
      const viewer = result.room.players.find((player) => player.id === socket.data.playerId);
      if (!viewer) continue;
      const viewerLang = getLang(socket.handshake.auth?.lang || req.body?.lang);
      const messageKey = reason === 'startHost' && !viewer.isHost ? 'startPlayer' : reason;
      socket.emit("room:start-blocked", {
        title: viewerLang === 'de' ? 'Spiel kann nicht starten' : viewerLang === 'en' ? 'Game cannot start' : 'Oyun başlatılamıyor',
        message: msg(viewerLang, messageKey),
        showDownload: reason === 'startHost',
        leaveRoom: false
      });
    }
    return res.json({ ok: false, blocked: true, reason });
  }

  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.roomCode !== result.room.code) continue;
    const viewerLang = getLang(socket.handshake.auth?.lang || req.body?.lang);
    socket.emit("room:start-blocked", {
      title: viewerLang === 'de' ? 'Tisch bereit' : viewerLang === 'en' ? 'Table ready' : 'Masa hazır',
      message: msg(viewerLang, 'allDownloaded'),
      showDownload: false,
      leaveRoom: true
    });
  }

  return res.json({ ok: true, blocked: true });
});

io.on("connection", (socket) => {
  const auth = socket.handshake.auth || {};
  const room = getRoom(auth.roomCode);
  const player = findPlayer(room, auth.token);

  if (!room || !player) {
    socket.disconnect(true);
    return;
  }

  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  player.lastSeen = Date.now();
  socket.join(room.code);

  socket.emit("room:state", {
    room: publicRoom(room),
    messages: room.messages
  });

  socket.on("voice:join", () => {
    if (!player.downloaded) {
      socket.emit("voice:blocked", {
        title: msg(socket.handshake.auth?.lang,'voiceTitle'),
        message: msg(socket.handshake.auth?.lang,'voiceMessage')
      });
      return;
    }

    for (const other of room.players) {
      if (other.id === player.id || !other.downloaded) continue;
      const otherSocket = [...io.sockets.sockets.values()].find(s => s.data.roomCode === room.code && s.data.playerId === other.id);
      if (otherSocket) otherSocket.emit("voice:peer-joined", { playerId: player.id });
    }
  });
  socket.on("voice:offer", ({to, offer} = {}) => {
    if (!player.downloaded || !to || !offer) return;
    const targetPlayer = room.players.find(p => p.id === to);
    if (!targetPlayer?.downloaded) return;
    const target=[...io.sockets.sockets.values()].find(s=>s.data.roomCode===room.code && s.data.playerId===to);
    if(target) target.emit("voice:offer", {from:player.id, offer});
  });
  socket.on("voice:answer", ({to, answer} = {}) => {
    if (!player.downloaded || !to || !answer) return;
    const targetPlayer = room.players.find(p => p.id === to);
    if (!targetPlayer?.downloaded) return;
    const target=[...io.sockets.sockets.values()].find(s=>s.data.roomCode===room.code && s.data.playerId===to);
    if(target) target.emit("voice:answer", {from:player.id, answer});
  });
  socket.on("voice:ice", ({to, candidate} = {}) => {
    if (!player.downloaded || !to || !candidate) return;
    const targetPlayer = room.players.find(p => p.id === to);
    if (!targetPlayer?.downloaded) return;
    const target=[...io.sockets.sockets.values()].find(s=>s.data.roomCode===room.code && s.data.playerId===to);
    if(target) target.emit("voice:ice", {from:player.id, candidate});
  });
  socket.on("voice:leave", () => {
    for (const other of room.players) {
      if (other.id === player.id) continue;
      const otherSocket=[...io.sockets.sockets.values()].find(s=>s.data.roomCode===room.code && s.data.playerId===other.id);
      if(otherSocket) otherSocket.emit("voice:peer-left", {playerId:player.id});
    }
  });
  socket.on("disconnect", () => {
    for (const other of room.players) {
      if (other.id === player.id) continue;
      const otherSocket=[...io.sockets.sockets.values()].find(s=>s.data.roomCode===room.code && s.data.playerId===other.id);
      if(otherSocket) otherSocket.emit("voice:peer-left", {playerId:player.id});
    }
  });
});

setInterval(() => {
  const cutoff = Date.now() - 1000 * 60 * 60 * 3;

  for (const [roomCode, room] of rooms) {
    const connectedPlayerIds = new Set([...io.sockets.sockets.values()]
      .filter((socket) => socket.data.roomCode === roomCode)
      .map((socket) => socket.data.playerId));
    room.players = room.players.filter((player) =>
      connectedPlayerIds.has(player.id) || player.lastSeen > cutoff
    );

    if (!room.players.length) {
      clearRoomImages(room);
      rooms.delete(roomCode);
      continue;
    }

    if (!room.players.some((player) => player.isHost)) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
    }

    broadcast(room);
  }
}, 60_000);

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Play Uno çalışıyor: http://localhost:${PORT}`);
});
