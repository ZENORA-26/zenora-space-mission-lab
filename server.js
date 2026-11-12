'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 64 * 1024, pingTimeout: 20000, pingInterval: 25000 });
const PORT = Number(process.env.PORT) || 3000;
const rooms = new Map();
const MAX_ROOM_MEMBERS = 4;
const MAX_ROOMS = 200;
const allowedFields = new Set([
  'missionName', 'destination', 'rocket', 'payload', 'duration', 'budget', 'objective', 'difficulty', 'teamMode',
  'dataCapacity', 'downlink', 'battery', 'rolePlanner', 'roleEngineer', 'roleScience', 'roleComms',
  'aDest', 'aRocket', 'aPayload', 'bDest', 'bRocket', 'bPayload', 'orbScenario', 'orbAltitude',
  'sciencePriority', 'riskPriority', 'costPriority', 'powerPriority'
]);
const allowedRadios = { power: new Set(['solar', 'hybrid', 'rtg']), comms: new Set(['direct', 'relay', 'highgain']) };
const allowedInstruments = new Set(['camera', 'spectrometer', 'radar', 'magnetometer']);
const allowedCompliance = new Set(['compAuthorization', 'compRegistration', 'compDebris', 'compSpectrum', 'compPlanetary', 'compSafety']);
const allowedRoles = new Set(['Mission planner', 'Spacecraft engineer', 'Science lead', 'Communications lead']);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny', index: 'index.html', maxAge: '1h' }));
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'ZENORA', activeRooms: rooms.size }));

function cleanText(value, maxLength, fallback = '') {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const clean = {};
  for (const key of allowedFields) {
    const value = raw[key];
    if (typeof value === 'boolean') clean[key] = value;
    else if (typeof value === 'string' || typeof value === 'number') clean[key] = cleanText(value, 80);
  }
  clean.radios = {};
  for (const [key, allowed] of Object.entries(allowedRadios)) {
    const value = raw.radios?.[key];
    if (allowed.has(value)) clean.radios[key] = value;
  }
  clean.checkboxes = { '.instrument': [], '.compliance-check': [] };
  const instruments = raw.checkboxes?.['.instrument'];
  if (Array.isArray(instruments)) {
    clean.checkboxes['.instrument'] = instruments.slice(0, 8).filter((item) => item && allowedInstruments.has(item.value)).map((item) => ({ value: item.value, checked: !!item.checked }));
  }
  const compliance = raw.checkboxes?.['.compliance-check'];
  if (Array.isArray(compliance)) {
    clean.checkboxes['.compliance-check'] = compliance.slice(0, 8).filter((item) => item && allowedCompliance.has(item.value)).map((item) => ({ value: item.value, checked: !!item.checked }));
  }
  return clean;
}

function getMembers(room) {
  const roomData = rooms.get(room);
  return roomData ? [...roomData.members.values()].map(({ socketId, name, role }) => ({ socketId, name, role })) : [];
}

function leaveRoom(socket) {
  const room = socket.data.room;
  if (!room) return;
  const roomData = rooms.get(room);
  if (roomData) {
    const member = roomData.members.get(socket.id);
    roomData.members.delete(socket.id);
    socket.to(room).emit('member-left', { name: member?.name || 'A participant' });
    io.to(room).emit('members', getMembers(room));
    if (roomData.members.size === 0) rooms.delete(room);
  }
  socket.leave(room);
  socket.data.room = null;
}

function rateAllowed(socket) {
  const now = Date.now();
  const recent = (socket.data.updateTimes || []).filter((time) => now - time < 5000);
  if (recent.length >= 12) { socket.data.updateTimes = recent; return false; }
  recent.push(now);
  socket.data.updateTimes = recent;
  return true;
}

io.on('connection', (socket) => {
  socket.on('join-room', (payload = {}) => {
    leaveRoom(socket);
    const room = cleanText(payload.room, 12).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const name = cleanText(payload.name, 28);
    const role = allowedRoles.has(payload.role) ? payload.role : 'Mission planner';
    if (!room || !name) return socket.emit('room-error', { message: 'A valid room code and display name are required.' });
    let roomData = rooms.get(room);
    if (!roomData && rooms.size >= MAX_ROOMS) return socket.emit('room-error', { message: 'The server is at its temporary room limit. Try again later.' });
    if (roomData && roomData.members.size >= MAX_ROOM_MEMBERS) return socket.emit('room-error', { message: 'This mission room already has four participants.' });
    if (!roomData) { roomData = { members: new Map(), state: null }; rooms.set(room, roomData); }
    const state = sanitizeState(payload.state);
    if (!roomData.state && state) roomData.state = state;
    socket.join(room);
    socket.data.room = room;
    socket.data.name = name;
    roomData.members.set(socket.id, { socketId: socket.id, name, role });
    socket.emit('room-joined', { room, name, members: getMembers(room), state: roomData.state });
    socket.to(room).emit('member-joined', { name, role });
    io.to(room).emit('members', getMembers(room));
  });

  socket.on('mission-update', (payload = {}) => {
    if (!socket.data.room || !rateAllowed(socket)) return;
    const roomData = rooms.get(socket.data.room);
    const state = sanitizeState(payload.state);
    if (!roomData || !state) return;
    roomData.state = state;
    socket.to(socket.data.room).emit('mission-update', {
      name: socket.data.name || 'Team member', socketId: socket.id, state
    });
  });

  socket.on('leave-room', () => leaveRoom(socket));
  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ZENORA running at http://localhost:${PORT}`);
});
