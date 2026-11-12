'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const fields = [
    'missionName', 'destination', 'rocket', 'payload', 'duration', 'budget', 'objective', 'difficulty', 'teamMode',
    'dataCapacity', 'downlink', 'battery', 'rolePlanner', 'roleEngineer', 'roleScience', 'roleComms',
    'aDest', 'aRocket', 'aPayload', 'bDest', 'bRocket', 'bPayload', 'orbScenario', 'orbAltitude'
  ];
  const checkboxGroups = ['.instrument', '.compliance-check'];
  let socket = null;
  let joined = false;
  let applyingRemoteState = false;
  let updateTimer = null;

  function status(message, state = '') {
    $('mpStatus').textContent = message;
    $('mpStatus').className = `mp-status ${state}`.trim();
  }

  function snapshot() {
    const state = {};
    fields.forEach((id) => { if ($(id)) state[id] = $(id).value; });
    state.radios = {};
    ['power', 'comms'].forEach((name) => { state.radios[name] = document.querySelector(`input[name="${name}"]:checked`)?.value || ''; });
    state.checkboxes = {};
    checkboxGroups.forEach((selector) => {
      state.checkboxes[selector] = [...document.querySelectorAll(selector)].map((item) => ({ value: item.value || item.id, checked: item.checked }));
    });
    ['sciencePriority', 'riskPriority', 'costPriority', 'powerPriority'].forEach((id) => { if ($(id)) state[id] = $('' + id).checked; });
    return state;
  }

  function applyState(state) {
    if (!state || typeof state !== 'object') return;
    applyingRemoteState = true;
    fields.forEach((id) => { if ($(id) && typeof state[id] === 'string') $(id).value = state[id]; });
    Object.entries(state.radios || {}).forEach(([name, value]) => {
      const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(String(value))}"]`);
      if (radio) radio.checked = true;
    });
    Object.entries(state.checkboxes || {}).forEach(([selector, values]) => {
      if (!checkboxGroups.includes(selector) || !Array.isArray(values)) return;
      values.forEach((entry) => {
        const item = selector === '.instrument'
          ? document.querySelector(`.instrument[value="${CSS.escape(String(entry.value))}"]`)
          : $(String(entry.value));
        if (item) item.checked = !!entry.checked;
      });
    });
    ['sciencePriority', 'riskPriority', 'costPriority', 'powerPriority'].forEach((id) => { if ($(id) && typeof state[id] === 'boolean') $(id).checked = state[id]; });
    if ($('teamMode')) $('teamMode').dispatchEvent(new Event('change'));
    applyingRemoteState = false;
    $('runMission')?.click();
    if (typeof window.orbitalRefresh === 'function') window.orbitalRefresh();
  }

  function log(message) {
    const area = $('mpActivity');
    if (!area) return;
    if (area.textContent.includes('Join a room')) area.textContent = '';
    const item = document.createElement('p');
    item.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${message}`;
    area.prepend(item);
    while (area.children.length > 14) area.lastElementChild.remove();
  }

  function renderMembers(members) {
    $('mpCount').textContent = `${members.length}/4`;
    const area = $('mpMembers');
    area.replaceChildren();
    if (!members.length) { area.textContent = 'No active members.'; return; }
    members.forEach((member) => {
      const card = document.createElement('div'); card.className = 'member';
      const name = document.createElement('b'); name.textContent = member.name;
      const role = document.createElement('small'); role.textContent = member.role;
      card.append(name, role); area.append(card);
    });
  }

  function connect() {
    if (!window.io) {
      status('Socket.IO did not load. Start the ZENORA server and open the localhost address.', 'error');
      return false;
    }
    if (socket) return true;
    socket = window.io({ reconnection: true, reconnectionAttempts: 5, timeout: 8000 });
    socket.on('connect', () => status('Connected to the ZENORA server. Join a mission room.', 'online'));
    socket.on('connect_error', () => status('Cannot reach the server. Check that npm start is running and the address is reachable.', 'error'));
    socket.on('room-joined', (data) => {
      joined = true; $('mpJoin').disabled = true; $('mpLeave').disabled = false;
      status(`Joined ${data.room}. Shared mission planning is active.`, 'online');
      renderMembers(data.members || []);
      if (data.state) applyState(data.state);
      log(`Joined room ${data.room}.`);
    });
    socket.on('members', renderMembers);
    socket.on('mission-update', (data) => {
      if (data.socketId === socket.id) return;
      applyState(data.state);
      log(`${data.name || 'A teammate'} updated the shared mission.`);
    });
    socket.on('member-joined', (data) => log(`${data.name} joined (${data.role}).`));
    socket.on('member-left', (data) => log(`${data.name} left the room.`));
    socket.on('room-error', (data) => status(data.message || 'Room error.', 'error'));
    socket.on('disconnect', () => {
      joined = false; $('mpJoin').disabled = false; $('mpLeave').disabled = true;
      status('Disconnected from the collaboration server.', 'error'); renderMembers([]);
    });
    return true;
  }

  function sendUpdate() {
    if (joined && socket?.connected && !applyingRemoteState) socket.emit('mission-update', { state: snapshot() });
  }

  function scheduleUpdate() {
    if (!joined || applyingRemoteState) return;
    clearTimeout(updateTimer);
    updateTimer = setTimeout(sendUpdate, 180);
  }

  $('mpJoin').addEventListener('click', () => {
    if (!connect()) return;
    const room = $('mpRoom').value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
    const name = $('mpName').value.trim().slice(0, 28);
    const role = $('mpRole').value;
    if (!room || !name) { status('Enter a room code and display name.', 'error'); return; }
    if (joined) socket.emit('leave-room');
    socket.emit('join-room', { room, name, role, state: snapshot() });
  });

  $('mpLeave').addEventListener('click', () => {
    if (socket && joined) socket.emit('leave-room');
    joined = false; $('mpJoin').disabled = false; $('mpLeave').disabled = true;
    status('You left the mission room.'); renderMembers([]);
  });

  document.querySelectorAll('#designer input, #designer select, #systems input, #systems select, #compare input, #compare select, #orbital input, #orbital select, .compliance-check').forEach((item) => {
    item.addEventListener('change', scheduleUpdate);
    if (item.matches('input[type="text"], input[type="number"]')) item.addEventListener('input', scheduleUpdate);
  });
  window.addEventListener('beforeunload', () => { if (joined && socket) socket.emit('leave-room'); });
})();
