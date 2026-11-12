(() => {
  'use strict';
  const toggle = document.getElementById('assistantToggle');
  document.getElementById('assistantSidebarToggle')?.addEventListener('click', () => toggle?.click());
  const panel = document.getElementById('assistantPanel');
  const chat = document.getElementById('assistantChat');
  const form = document.getElementById('assistantForm');
  const input = document.getElementById('assistantInput');
  const resetButton = document.getElementById('assistantReset');
  if (!toggle || !panel || !chat || !form || !input) return;

  const welcomeMessage = 'Welcome, Commander. I can guide you through mission design, explain trade-offs and help interpret your analysis. What would you like to work on?';
  const add = (message, who) => {
    const el = document.createElement('div');
    el.className = `assistant-message ${who}`;
    el.textContent = message;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  };
  const resetChat = () => {
    // Clear only the conversation; mission configuration and game progress remain untouched.
    chat.replaceChildren();
    add(welcomeMessage, 'bot');
    input.value = '';
    chat.scrollTop = 0;
    input.focus({ preventScroll: true });
  };
  const open = () => { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); input.focus(); };
  const close = () => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); };

  toggle.addEventListener('click', () => panel.hidden ? open() : close());
  document.getElementById('assistantClose')?.addEventListener('click', close);
  if (resetButton) {
    resetButton.type = 'button';
    resetButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetChat();
    });
  }

  const jump = (id, label) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    add(`Taking you to ${label}.`, 'bot');
  };
  const routes = [
    { re: /start|begin|first|create|new mission|mission design/, text: 'Start in Mission Designer. Give your mission a name, choose Low Earth Orbit for a beginner run, select a launcher, then set payload mass, duration and budget. Continue to Spacecraft Systems, review your choices, and run Mission Analysis.', id: 'designer', label: 'Mission Designer' },
    { re: /spacecraft|system|payload|power|communication|comms|instrument/, text: 'Spacecraft Systems is where you balance science instruments with mass, power, communications and data needs. Adding instruments may improve science return but also increases resource demand. Keep the spacecraft within the launcher and budget limits.', id: 'systems', label: 'Spacecraft Systems' },
    { re: /score|improv|feasib|risk|result|analysis|failed|flag/, text: 'Run Mission Analysis and read the feasibility result and resource indicators. If something is flagged, change one thing at a time: reduce payload or mission duration, select a larger launcher, increase the budget, or simplify instrument and data requirements. Run the analysis again to compare.', id: 'simulation', label: 'Mission Analysis' },
    { re: /moon|mars|orbit|trajectory|hohmann/, text: 'Low Earth Orbit is the easiest place to learn. Moon and Mars concepts need more time and resources. Use Orbit Lab to explore idealized orbital estimates; these are educational approximations, not operational trajectories.', id: 'orbital', label: 'Orbit Lab' },
    { re: /event|contingen|failure|hazard|safety|compliance/, text: 'Use the Mission Event Deck to explore possible contingencies, then visit Compliance & Safety to review mission considerations such as debris, spectrum, registration and planetary protection. Treat each item as a discussion prompt, not certification.', id: 'events', label: 'Mission Event Deck' },
    { re: /campaign|challenge|xp|rank|career/, text: 'Open Mission Campaign for guided challenges. Read each challenge objective, configure the mission to meet it, then submit or complete the challenge using the controls on its card. Your progress and rewards are shown in the campaign panel.', id: 'campaign', label: 'Mission Campaign' },
    { re: /team|collab|room|multiplayer/, text: 'For team play, open Team Collaboration, create or join a room, and share the room code with your teammates. Everyone needs to connect to the same running ZENORA server.', id: 'multiplayer', label: 'Team Collaboration' },
    { re: /nasa|asteroid|neo|near earth/, text: 'Open NASA Data / Asteroid Explorer, choose a date range and load the objects. You need an internet connection; NASA demo credentials may have request limits.', id: 'asteroids', label: 'NASA Asteroid Explorer' },
    { re: /compare|a\/b|version/, text: 'Use Mission Compare to evaluate two configurations side by side. Change one or more design choices in the alternate configuration and compare the reported trade-offs.', id: 'compare', label: 'Mission Compare' },
    { re: /report|export|summary/, text: 'After running an analysis, open Mission Report to review the mission summary, resource results and design notes. Use the report controls provided there to save or share your results.', id: 'report', label: 'Mission Report' }
  ];
  function respond(question) {
    const q = question.toLowerCase();
    const route = routes.find(item => item.re.test(q));
    if (route) {
      add(route.text, 'bot');
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'assistant-jump';
      button.textContent = `Open ${route.label} ↗`;
      button.addEventListener('click', () => jump(route.id, route.label));
      chat.appendChild(button); chat.scrollTop = chat.scrollHeight; return;
    }
    if (/help|what can you|how to play|controls/.test(q)) return add('I am your ZENORA gameplay guide. Ask me how to start a mission, configure spacecraft systems, improve analysis results, use the campaign, compare designs, explore orbital mechanics, review safety, use NASA data or play with a team. You can also use the quick-start buttons above.', 'bot');
    add('I can guide you through the game step by step. Try asking: “How do I start a mission?”, “How can I improve my score?”, “Explain spacecraft systems”, or “How do I use the Orbit Lab?”', 'bot');
  }
  const send = value => { const q = value.trim(); if (!q) return; add(q, 'user'); respond(q); };
  form.addEventListener('submit', event => { event.preventDefault(); send(input.value); input.value = ''; input.focus(); });
  panel.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => send(button.dataset.prompt)));
})();
