const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory room storage
const rooms = {};

// Clean old rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].createdAt > 30 * 60 * 1000) {
      delete rooms[code];
    }
  }
}, 5 * 60 * 1000);

function genCode() {
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

// ── ROUTES ──────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Termin Oyunu Backend işləyir ✅', rooms: Object.keys(rooms).length });
});

// Create room (teacher)
app.post('/room/create', (req, res) => {
  let code = genCode();
  while (rooms[code]) code = genCode();

  rooms[code] = {
    code,
    status: 'waiting',
    players: [],
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
  };

  res.json({ code });
});

// Get room info
app.get('/room/:code', (req, res) => {
  const room = rooms[req.params.code.toUpperCase()];
  if (!room) return res.status(404).json({ error: 'Otaq tapılmadı' });
  res.json(room);
});

// Join room (student)
app.post('/room/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Otaq tapılmadı' });
  if (room.status === 'finished') return res.status(400).json({ error: 'Oyun bitib' });

  const { name, av } = req.body;
  if (!name || !av) return res.status(400).json({ error: 'Ad və obraz tələb olunur' });

  // Remove duplicate name
  room.players = room.players.filter(p => p.name !== name);
  const id = Date.now() + '' + Math.random();
  room.players.push({ id, name, av, score: 0, found: 0, finished: false });

  res.json({ id, room });
});

// Start game (teacher)
app.post('/room/:code/start', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Otaq tapılmadı' });

  room.status = 'started';
  room.startedAt = Date.now();

  res.json({ ok: true, room });
});

// Submit score (student)
app.post('/room/:code/score', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Otaq tapılmadı' });

  const { id, score, found } = req.body;
  const player = room.players.find(p => p.id === id);
  if (player) {
    player.score = score;
    player.found = found;
    player.finished = true;
  }

  // Check if all finished
  if (room.players.length > 0 && room.players.every(p => p.finished)) {
    room.status = 'finished';
    room.finishedAt = Date.now();
  }

  res.json({ ok: true });
});

// Teacher ends game manually
app.post('/room/:code/finish', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Otaq tapılmadı' });
  room.status = 'finished';
  room.finishedAt = Date.now();
  res.json({ ok: true, room });
});

app.listen(PORT, () => {
  console.log(`Termin Oyunu Backend ${PORT} portunda işləyir`);
});
