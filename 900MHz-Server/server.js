const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 20;

const DEFAULT_MATRIX = Array.from({ length: 8 }, () => Array(7).fill(0));

let seqCounter = 0;
const history = [];
let currentEsp32State = null; // Format: [1, modeIndex, speedValue]

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/esp32', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'esp32.html'));
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send current buffered history (up to 20 latest records) to newly connected viewer
  socket.emit('history_init', history);

  // Send latest ESP32 animation state [1, modeIndex, speedValue] if already set
  if (currentEsp32State !== null) {
    socket.emit('esp32_state_init', currentEsp32State);
  }

  // Listen for 'client_msg' events
  socket.on('client_msg', (data) => {
    const timestamp = new Date().toISOString();
    seqCounter += 1;

    console.log(`[client_msg] #${seqCounter} (${timestamp}) from ${socket.id}:`);
    console.log(JSON.stringify(data));

    const record = {
      seq: seqCounter,
      timestamp,
      data: Array.isArray(data) ? data : DEFAULT_MATRIX
    };

    history.unshift(record);
    if (history.length > MAX_HISTORY) {
      history.length = MAX_HISTORY;
    }

    // Broadcast the received payload to all connected clients on 'client_msg'
    io.emit('client_msg', record.data);
  });

  // Listen for 'esp32-msg' events — expected format: [1, modeIndex, speedValue]
  socket.on('esp32-msg', (payload) => {
    if (!Array.isArray(payload) || payload.length !== 3) {
      console.warn(`[esp32-msg] Invalid payload format from ${socket.id} (expected [1, mode, speed]):`, payload);
      return;
    }

    const parsed = payload.map((v) => Number.parseInt(v, 10));
    if (parsed.some((v) => !Number.isInteger(v))) {
      console.warn(`[esp32-msg] Non-integer values in payload from ${socket.id}:`, payload);
      return;
    }

    const timestamp = new Date().toISOString();
    currentEsp32State = parsed;

    console.log(`[esp32-msg] (${timestamp}) from ${socket.id}: ${JSON.stringify(parsed)}`);

    // Broadcast [1, modeIndex, speedValue] to ESP32 and all connected clients
    io.emit('esp32-msg', parsed);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`900MHz Server Viewer listening on http://localhost:${PORT}`);
});
