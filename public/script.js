'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  window.ORBITAL_VERSION = '4.0';
  const destinationFactor = { orbit: 1, moon: 2.4, mars: 5.8 };
  const destinationName = { orbit: 'Low Earth Orbit', moon: 'Moon', mars: 'Mars' };
  const instruments = {
    camera: { name: 'Optical camera', mass: 35, power: 0.8, data: 1.8, science: 22 },
    spectrometer: { name: 'Spectrometer', mass: 55, power: 1.2, data: 2.4, science: 30 },
    radar: { name: 'Radar mapper', mass: 90, power: 2.0, data: 4.2, science: 34 },
    magnetometer: { name: 'Magnetometer', mass: 18, power: 0.3, data: 0.5, science: 14 }
  };
  const fmt = (n, digits = 1) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const selectedRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  let lastDesign = null;
  let lastEvent = null;
  let activeChallenge = null;
  let activeMissionId = null;
  const careerKey = 'orbital40Career'; // Career record is isolated from 3.x data.
  const appVersion = '4.1';
  const missionLibraryKey = 'orbital31MissionLibrary';
  const draftKey = 'orbital31CurrentDraft';
  const challengeDefinitions = {
    earth: { title: 'EarthWatch Pathfinder', level: 'BEGINNER', target: 65, xp: 100, description: 'Build a dependable low-Earth-orbit observation mission.', goals: ['Destination: LEO', 'Score: 65+', 'Pass mass and budget checks'], preset: { dest:'orbit', rocket:'150', mass:'350', duration:'90', budget:'300', objective:'earth', difficulty:'beginner', storage:'120', downlink:'8', battery:'24', power:'solar', comms:'direct', instruments:['camera','spectrometer'] }, test: d => d.dest==='orbit' && d.score>=65 && d.massOK && d.budgetOK },
    climate: { title: 'Climate Sentinel', level: 'BEGINNER', target: 65, xp: 125, description: 'Configure a longer Earth-observation mission with balanced science and data return.', goals: ['Destination: LEO', 'Pass power and downlink checks', 'Score: 65+'], preset: { dest:'orbit', rocket:'180', mass:'320', duration:'180', budget:'360', objective:'earth', difficulty:'beginner', storage:'160', downlink:'12', battery:'30', power:'hybrid', comms:'direct', instruments:['camera','spectrometer','magnetometer'] }, test: d => d.dest==='orbit' && d.score>=65 && d.powerOK && d.downlinkOK },
    moon: { title: 'Lunar Relay Network', level: 'INTERMEDIATE', target: 65, xp: 150, description: 'Plan a lunar science mission supported by relay communications.', goals: ['Destination: Moon', 'Use relay communications', 'Pass storage and downlink checks'], preset: { dest:'moon', rocket:'300', mass:'300', duration:'12', budget:'450', objective:'communications', difficulty:'intermediate', storage:'120', downlink:'8', battery:'24', power:'hybrid', comms:'relay', instruments:['camera','spectrometer','magnetometer'] }, test: d => d.dest==='moon' && d.score>=65 && d.comms==='relay' && d.storageOK && d.downlinkOK },
    lunarPower: { title: 'Lunar Night Operations', level: 'INTERMEDIATE', target: 60, xp: 175, description: 'Prepare a lunar surface concept with resilient power and battery reserve.', goals: ['Destination: Moon', 'Pass power and battery checks', 'Score: 60+'], preset: { dest:'moon', rocket:'350', mass:'280', duration:'30', budget:'500', objective:'exploration', difficulty:'intermediate', storage:'150', downlink:'10', battery:'35', power:'hybrid', comms:'highgain', instruments:['camera','magnetometer'] }, test: d => d.dest==='moon' && d.score>=60 && d.powerOK && d.batteryOK },
    asteroid: { title: 'Lunar Prospecting Survey', level: 'ADVANCED', target: 60, xp: 200, description: 'Design a compact asteroid reconnaissance spacecraft and science-data pipeline.', goals: ['Destination: Asteroid', 'Pass mass and data checks', 'Score: 60+'], preset: { dest:'moon', rocket:'400', mass:'220', duration:'120', budget:'550', objective:'exploration', difficulty:'expert', storage:'140', downlink:'10', battery:'30', power:'hybrid', comms:'highgain', instruments:['camera','spectrometer'] }, test: d => d.dest==='moon' && d.score>=60 && d.massOK && d.storageOK && d.downlinkOK },
    mars: { title: 'Mars Pathfinder', level: 'ADVANCED', target: 60, xp: 225, description: 'Build a Mars concept around an RTG power architecture.', goals: ['Destination: Mars', 'Use RTG power', 'Pass power and battery checks'], preset: { dest:'mars', rocket:'500', mass:'250', duration:'300', budget:'650', objective:'exploration', difficulty:'expert', storage:'120', downlink:'8', battery:'24', power:'rtg', comms:'highgain', instruments:['camera','magnetometer'] }, test: d => d.dest==='mars' && d.score>=60 && d.powerType==='rtg' && d.powerOK && d.batteryOK },
    deepRelay: { title: 'Deep Space Relay', level: 'EXPERT', target: 60, xp: 250, description: 'Engineer a deep-space communications architecture with high-gain downlink.', goals: ['Destination: Mars', 'Use high-gain communications', 'Pass downlink and storage checks'], preset: { dest:'mars', rocket:'600', mass:'230', duration:'450', budget:'750', objective:'communications', difficulty:'expert', storage:'180', downlink:'14', battery:'30', power:'rtg', comms:'highgain', instruments:['camera','spectrometer'] }, test: d => d.dest==='mars' && d.score>=60 && d.comms==='highgain' && d.downlinkOK && d.storageOK },
    flagship: { title: 'Mars Flagship Expedition', level: 'EXPERT', target: 65, xp: 300, description: 'Complete an ambitious flagship Mars mission concept with every resource check satisfied.', goals: ['Destination: Jupiter', 'Pass all six engineering checks', 'Score: 65+'], preset: { dest:'mars', rocket:'900', mass:'180', duration:'600', budget:'1100', objective:'exploration', difficulty:'expert', storage:'180', downlink:'16', battery:'30', power:'rtg', comms:'highgain', instruments:['camera','spectrometer','magnetometer'] }, test: d => d.dest==='mars' && d.score>=65 && d.go }
  };
  const challengeOrder = Object.keys(challengeDefinitions);
  function readCareer() {
    try {
      const value = JSON.parse(localStorage.getItem(careerKey) || '{}');
      return { xp: Number(value.xp) || 0, achievements: value.achievements && typeof value.achievements === 'object' ? value.achievements : {}, completed: value.completed && typeof value.completed === 'object' ? value.completed : {} };
    } catch { return { xp: 0, achievements: {}, completed: {} }; }
  }
  let career = readCareer();
  function saveCareer() { try { localStorage.setItem(careerKey, JSON.stringify(career)); } catch { /* Private browsing or storage restrictions: session still works. */ } }
  function award(key, title, xp) {
    if (career.achievements[key]) return false;
    career.achievements[key] = { title, xp };
    career.xp += xp;
    saveCareer();
    updateCareer();
    if ($('gameNotice')) $('gameNotice').textContent = `Achievement unlocked: ${title} · +${xp} XP`;
    return true;
  }
  function updateCareer() {
    const ranks = [
      { name: 'Cadet', min: 0 }, { name: 'Flight Officer', min: 100 }, { name: 'Mission Specialist', min: 250 },
      { name: 'Senior Specialist', min: 450 }, { name: 'Mission Commander', min: 700 }, { name: 'Chief Mission Architect', min: 1000 },
      { name: 'Legendary Mission Director', min: 1400 }
    ];
    const rankIndex = ranks.reduce((index, rank, i) => career.xp >= rank.min ? i : index, 0);
    const current = ranks[rankIndex], next = ranks[rankIndex + 1];
    if ($('commanderRank')) $('commanderRank').textContent = current.name;
    if ($('commanderXP')) $('commanderXP').textContent = `${career.xp} XP`;
    if ($('commanderNext')) $('commanderNext').textContent = next ? `${next.min - career.xp} XP to ${next.name}` : 'Top rank achieved. Complete the full campaign.';
    if ($('commanderXPBar')) $('commanderXPBar').style.width = next ? `${Math.max(0, Math.min(100, (career.xp - current.min) / (next.min - current.min) * 100))}%` : '100%';
    const list = $('achievementList');
    if (list) {
      list.replaceChildren();
      const entries = Object.values(career.achievements);
      if (!entries.length) list.textContent = 'No achievements yet. Complete a campaign mission to earn your first badge.';
      entries.forEach(entry => { const badge = document.createElement('span'); badge.className = 'achievement-badge'; badge.textContent = `${entry.title} · +${entry.xp} XP`; list.append(badge); });
    }
    renderCampaign();
  }
  function renderCampaign() {
    const grid = $('challengeGrid');
    if (!grid) return;
    grid.replaceChildren();
    const firstIncomplete = challengeOrder.findIndex(key => !career.completed[key]);
    challengeOrder.forEach((key, index) => {
      const item = challengeDefinitions[key];
      const done = !!career.completed[key];
      const unlocked = done || index === 0 || (firstIncomplete >= 0 && index <= firstIncomplete);
      const card = document.createElement('article'); card.className = 'challenge-card' + (done ? ' is-complete' : '');
      const tag = document.createElement('div'); tag.className = 'challenge-index'; tag.textContent = `MISSION ${String(index+1).padStart(2,'0')} · ${item.level}`;
      const title = document.createElement('h3'); title.textContent = item.title;
      const desc = document.createElement('p'); desc.textContent = item.description;
      const goals = document.createElement('ul'); item.goals.forEach(goal => { const li=document.createElement('li'); li.textContent=goal; goals.append(li); });
      const reward = document.createElement('p'); reward.className='campaign-reward'; reward.textContent=`Reward: ${item.xp} XP`;
      const button = document.createElement('button'); button.type='button'; button.className='btn alt challenge-button'; button.textContent=done?'Replay mission':unlocked?'Start mission':'Locked · complete previous mission'; button.disabled=!unlocked; button.addEventListener('click',()=>loadChallenge(key));
      const state=document.createElement('span'); state.className='challenge-state'+(done?' completed':''); state.textContent=done?'COMPLETED ✓ · replay available':unlocked?'UNLOCKED · ready for launch':'LOCKED · campaign progression';
      card.append(tag,title,desc,goals,reward,button,state); grid.append(card);
    });
    const doneCount=challengeOrder.filter(key=>career.completed[key]).length;
    const message=$('campaignProgress');
    if(message) message.textContent=`Campaign progress: ${doneCount} / ${challengeOrder.length} missions completed`;
  }
  function evaluateChallenge(d) {
    if (!activeChallenge) return;
    const challenge = challengeDefinitions[activeChallenge];
    if (!challenge) return;
    if (career.completed[activeChallenge]) { $('challengeMessage').textContent = `${challenge.title} is complete. Replay is for practice; XP is awarded only once.`; activeChallenge = null; return; }
    const index = challengeOrder.indexOf(activeChallenge);
    const priorComplete = challengeOrder.slice(0,index).every(key => career.completed[key]);
    if (!priorComplete) { $('challengeMessage').textContent = 'Complete the earlier campaign missions before attempting this one.'; return; }
    if (challenge.test(d)) {
      career.completed[activeChallenge] = true;
      career.xp += challenge.xp;
      career.achievements[`challenge-${activeChallenge}`] = { title: `${challenge.title} completed`, xp: challenge.xp };
      saveCareer(); updateCareer();
      $('challengeMessage').textContent = `Mission complete: ${challenge.title}. You earned ${challenge.xp} XP and unlocked the next campaign mission.`;
      $('gameNotice').textContent = `Campaign milestone achieved · ${challenge.title} · +${challenge.xp} XP`;
      activeChallenge = null;
    } else {
      $('challengeMessage').textContent = `${challenge.title}: target score ${challenge.target}+. Check the listed objectives and engineering checks, then run analysis again.`;
    }
  }
  function loadChallenge(key) {
    const challenge = challengeDefinitions[key];
    if (!challenge) return;
    const index = challengeOrder.indexOf(key);
    const priorComplete = challengeOrder.slice(0,index).every(item => career.completed[item]);
    if (!career.completed[key] && !priorComplete) {
      $('challengeMessage').textContent = 'This mission is locked. Complete the previous campaign mission first.';
      return;
    }
    activeChallenge = career.completed[key] ? null : key;
    const p = challenge.preset;
    $('missionName').value = challenge.title; $('destination').value = p.dest; $('rocket').value = p.rocket; $('payload').value = p.mass;
    $('duration').value = p.duration; $('budget').value = p.budget; $('objective').value = p.objective; $('difficulty').value = p.difficulty;
    $('dataCapacity').value = p.storage; $('downlink').value = p.downlink; $('battery').value = p.battery;
    const power = document.querySelector(`input[name="power"][value="${p.power}"]`);
    const comms = document.querySelector(`input[name="comms"][value="${p.comms}"]`);
    if (power) power.checked = true;
    if (comms) comms.checked = true;
    document.querySelectorAll('.instrument').forEach(item => { item.checked = p.instruments.includes(item.value); });
    $('challengeMessage').textContent = career.completed[key]
      ? `${challenge.title} loaded in replay mode. Edit every setting and practise again; XP is not awarded twice.`
      : `${challenge.title} loaded. Complete the listed objectives and run mission analysis to qualify.`;
    $('workspaceStatus').textContent = `Loaded ${challenge.title}. All mission fields are editable.`;
    activeMissionId = null;
    runMission();
    $('designer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function readCommonInputs() {
    const selected = [...document.querySelectorAll('.instrument:checked')].map((el) => instruments[el.value]).filter(Boolean);
    return {
      instruments: selected,
      powerType: selectedRadio('power'),
      comms: selectedRadio('comms'),
      dataCapacity: Number($('dataCapacity').value),
      downlink: Number($('downlink').value),
      battery: Number($('battery').value),
      objective: $('objective').value,
      difficulty: $('difficulty').value,
      priorities: {
        science: $('sciencePriority')?.checked ?? true,
        risk: $('riskPriority')?.checked ?? true,
        cost: $('costPriority')?.checked ?? false,
        power: $('powerPriority')?.checked ?? false
      }
    };
  }

  function calculateModel(input) {
    const factor = destinationFactor[input.dest];
    const instrumentMass = input.instruments.reduce((sum, item) => sum + item.mass, 0);
    const instrumentPower = input.instruments.reduce((sum, item) => sum + item.power, 0);
    const dataRate = input.instruments.reduce((sum, item) => sum + item.data, 0);
    const science = input.instruments.reduce((sum, item) => sum + item.science, 0);
    const busPower = 0.65;
    const demand = instrumentPower + busPower;
    const subsystemAllowance = (input.baseMass + instrumentMass) * 0.15;
    const mass = input.baseMass + instrumentMass + subsystemAllowance;
    const capacity = input.rocket * 10 / factor;
    const cost = input.rocket * 0.55 + mass * 0.075 + input.duration * 0.12 + factor * 38;
    const solarFactor = input.dest === 'mars' ? 1 / (1.523679 ** 2) : 1;
    const available = input.powerType === 'rtg' ? 5.2 : (input.powerType === 'hybrid' ? 5.8 : 5.0) * solarFactor;
    const margin = available - demand;
    const commsProfiles = {
      direct: { throughput: 1.0, contact: 0.72, label: 'Direct-to-Earth' },
      relay: { throughput: 1.25, contact: 0.86, label: 'Relay-assisted' },
      highgain: { throughput: 1.35, contact: 0.80, label: 'High-gain antenna' }
    };
    const profile = commsProfiles[input.comms] || commsProfiles.direct;
    const effectiveDownlink = input.downlink * profile.throughput * profile.contact;
    const generatedData = dataRate * input.duration;
    const storageNeed = dataRate * 3 + Math.max(0, dataRate - effectiveDownlink) * input.duration;
    const storageOK = input.dataCapacity >= storageNeed;
    const downlinkOK = effectiveDownlink >= dataRate;
    const batteryNeed = demand * 2 / (0.85 * 0.75);
    const batteryOK = input.battery >= batteryNeed;
    const massOK = mass <= capacity;
    const budgetOK = cost <= input.budget;
    const powerOK = margin >= 0;
    const checks = [
      { key: 'mass', label: 'Mass capacity', ok: massOK, detail: `${fmt(mass)} kg / ${fmt(capacity)} kg` },
      { key: 'budget', label: 'Budget', ok: budgetOK, detail: `$${fmt(cost)}M / $${fmt(input.budget)}M` },
      { key: 'power', label: 'Power balance', ok: powerOK, detail: `${fmt(demand)} kW demand / ${fmt(available)} kW available` },
      { key: 'storage', label: 'Data storage', ok: storageOK, detail: `${fmt(input.dataCapacity)} GB / ${fmt(storageNeed)} GB required` },
      { key: 'downlink', label: 'Downlink throughput', ok: downlinkOK, detail: `${fmt(effectiveDownlink)} GB/day / ${fmt(dataRate)} GB/day generated` },
      { key: 'battery', label: 'Battery reserve', ok: batteryOK, detail: `${fmt(input.battery)} kWh / ${fmt(batteryNeed)} kWh required` }
    ];
    const passed = checks.filter((item) => item.ok).length;
    const massMargin = capacity > 0 ? (capacity - mass) / capacity : -1;
    const costMargin = input.budget > 0 ? (input.budget - cost) / input.budget : -1;
    const powerMargin = available > 0 ? margin / available : -1;
    const riskBase = 16 + (6 - passed) * 10 + (massMargin < 0.12 ? 8 : 0) + (costMargin < 0.12 ? 6 : 0) + (powerMargin < 0.12 ? 8 : 0) + (input.dest === 'mars' ? 8 : input.dest === 'moon' ? 3 : 0);
    const difficultyFactor = { beginner: 0.88, intermediate: 1, expert: 1.14 }[input.difficulty] || 1;
    const risk = Math.max(5, Math.min(98, Math.round(riskBase * difficultyFactor)));
    const scienceScore = Math.min(100, science * 1.35);
    const marginScore = Math.max(0, Math.min(100, 50 + massMargin * 100 + powerMargin * 30 + costMargin * 20));
    const priorityBonus = (input.priorities.science ? scienceScore * 0.08 : 0) + (input.priorities.power ? Math.max(0, powerMargin) * 12 : 0) + (input.priorities.cost ? Math.max(0, costMargin) * 10 : 0);
    const score = Math.max(0, Math.min(100, Math.round(passed / 6 * 72 + marginScore * 0.18 + scienceScore * (input.priorities.science ? 0.12 : 0.06) - risk * (input.priorities.risk ? 0.10 : 0.04) + priorityBonus)));
    return {
      ...input, factor, instrumentMass, instrumentPower, busPower, subsystemAllowance, mass, capacity, cost,
      demand, available, margin, solarFactor, dataRate, generatedData, storageNeed, effectiveDownlink,
      downlinkOK, storageOK, batteryNeed, batteryOK, massOK, budgetOK, powerOK, checks, passed,
      risk, score, science, go: checks.every((item) => item.ok), commsLabel: profile.label,
      massMargin, costMargin, powerMargin
    };
  }

  function showDesignerError(message, fieldIds = []) {
    const box = $('designerError');
    if (box) {
      box.hidden = !message;
      box.textContent = message || '';
    }
    document.querySelectorAll('#designer .field-invalid').forEach((el) => el.classList.remove('field-invalid'));
    fieldIds.forEach((id) => $(id)?.classList.add('field-invalid'));
  }

  function validateInput(input) {
    const required = [
      ['Spacecraft bus & payload mass', input.baseMass], ['Mission duration', input.duration], ['Budget', input.budget],
      ['Data storage', input.common.dataCapacity], ['Downlink capacity', input.common.downlink], ['Battery reserve', input.common.battery]
    ];
    const invalid = required.find(([, value]) => !Number.isFinite(value) || value <= 0);
    if (invalid) {
      const fieldMap = { 'Spacecraft bus & payload mass': 'payload', 'Mission duration': 'duration', 'Budget': 'budget', 'Data storage': 'dataCapacity', 'Downlink capacity': 'downlink', 'Battery reserve': 'battery' };
      showDesignerError(`${invalid[0]} must be a number greater than zero. Please correct the highlighted field.`, [fieldMap[invalid[0]]]);
      return `${invalid[0]} must be a number greater than zero.`;
    }
    if (!Number.isFinite(input.rocket) || input.rocket <= 0) { showDesignerError('Please select a valid launcher.'); return 'Choose a valid launcher.'; }
    if (!input.common.powerType || !input.common.comms) { showDesignerError('Choose both a power system and communications architecture.'); return 'Choose a power and communications architecture.'; }
    if (input.duration > 3650) { showDesignerError('Mission duration must be 3,650 days or less.'); $('duration')?.classList.add('field-invalid'); return 'Mission duration must be 3,650 days or less in this teaching model.'; }
    if (input.baseMass > 100000) { showDesignerError('Spacecraft mass exceeds the model limit of 100,000 kg.'); $('payload')?.classList.add('field-invalid'); return 'Base spacecraft mass exceeds the model input limit of 100,000 kg.'; }
    showDesignerError('');
    return '';
  }

  function currentInput() {
    return {
      name: $('missionName').value.trim() || 'Untitled mission',
      dest: $('destination').value,
      rocket: Number($('rocket').value),
      baseMass: Number($('payload').value),
      duration: Number($('duration').value),
      budget: Number($('budget').value),
      common: readCommonInputs()
    };
  }

  function drawResourceChart(d) {
    const canvas = $('resourceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    ctx.clearRect(0, 0, width, canvas.height);
    const groups = [
      { title: 'MASS · kg', values: [['Spacecraft estimate', d.mass], ['Launcher model capacity', d.capacity]] },
      { title: 'POWER · kW', values: [['Power demand', d.demand], ['Power available', d.available]] },
      { title: 'DATA · GB/day', values: [['Data generation', d.dataRate], ['Effective downlink', d.effectiveDownlink]] }
    ];
    groups.forEach((group, index) => {
      const y = 16 + index * 88;
      ctx.fillStyle = '#65e6d0'; ctx.font = 'bold 12px Arial'; ctx.fillText(group.title, 8, y + 10);
      const max = Math.max(...group.values.map((item) => item[1]), 1) * 1.18;
      group.values.forEach((item, j) => {
        const by = y + 20 + j * 25;
        ctx.fillStyle = '#a8bbcf'; ctx.font = '11px Arial'; ctx.fillText(item[0], 8, by + 12);
        ctx.fillStyle = '#203b54'; ctx.fillRect(150, by, width - 285, 14);
        ctx.fillStyle = j === 0 ? '#65e6d0' : '#8eb9ff';
        ctx.fillRect(150, by, (width - 285) * Math.min(1, item[1] / max), 14);
        ctx.fillStyle = '#edf5ff'; ctx.fillText(fmt(item[1]), width - 118, by + 12);
      });
    });
  }

  function renderTimeline(d) {
    const phases = [
      ['PHASE 01', 'Mission definition', 'Confirm objectives, constraints, team roles and review scope.'],
      ['PHASE 02', 'Design & integration', `Configure ${d.instruments.length} instrument(s), power, data and communications.`],
      ['PHASE 03', 'Launch & commissioning', 'Conceptual deployment, initial health checks and system checkout.'],
      ['PHASE 04', 'Cruise / operations', `${destinationName[d.dest]} operations over the selected ${d.duration}-day mission.`],
      ['PHASE 05', 'Data return & closeout', 'Downlink science data, review end-of-life and archive mission results.']
    ];
    $('timelineItems').innerHTML = phases.map(([phase, title, desc]) => `<div><small>${phase}</small><h3>${title}</h3><p>${escapeHTML(desc)}</p></div>`).join('');
  }

  function complianceState() {
    const checks = [...document.querySelectorAll('.compliance-check')];
    const done = checks.filter((item) => item.checked).length;
    if ($('complianceCount')) $('complianceCount').textContent = `${done} / ${checks.length}`;
    if ($('complianceStatus')) $('complianceStatus').textContent = done === checks.length ? 'All review topics have been marked as reviewed. This is not a compliance certification.' : `${checks.length - done} topic(s) remain to be reviewed by the mission team.`;
    return { done, total: checks.length };
  }

  function renderReport(d) {
    const compliance = complianceState();
    const checkMarkup = d.checks.map((item) => `<div class="check ${item.ok ? 'ok' : 'bad'}"><b>${item.ok ? '✓' : '!' } ${item.label}</b><small>${escapeHTML(item.detail)}</small></div>`).join('');
    $('reportContent').innerHTML = `<div class="report-head"><h3>${escapeHTML(d.name)}</h3><p>${destinationName[d.dest]} · ${escapeHTML(d.objective)} · ${escapeHTML(d.difficulty)}</p><strong>${d.score}/100 MODEL SCORE</strong></div><div class="check-grid">${checkMarkup}</div><p><b>Mass model:</b> ${fmt(d.baseMass)} kg base mass + ${fmt(d.instrumentMass)} kg instruments + ${fmt(d.subsystemAllowance)} kg modelled subsystem allowance = ${fmt(d.mass)} kg.</p><p><b>Power model:</b> ${fmt(d.demand)} kW demand, including ${fmt(d.busPower)} kW bus allowance, against ${fmt(d.available)} kW modelled available power. Power margin: ${fmt(d.margin)} kW.</p><p><b>Data model:</b> ${fmt(d.dataRate)} GB/day generated; ${fmt(d.effectiveDownlink)} GB/day effective downlink; ${fmt(d.storageNeed)} GB modelled buffer requirement.</p><p><b>Battery model:</b> ${fmt(d.batteryNeed)} kWh modelled reserve requirement for a two-hour design case with assumed efficiency and usable-energy factors.</p><p><b>Compliance review:</b> ${compliance.done}/${compliance.total} awareness topics marked reviewed. This checklist is not legal advice or certification.</p><p><b>Recommendation:</b> ${d.go ? 'All six simplified engineering checks pass. Review assumptions, margins and compliance topics before drawing conclusions.' : 'Review each failed engineering check. Adjust the mass, budget, power, storage, downlink or battery design and run the analysis again.'}</p><p class="hint">All capacities, costs, resource models and scores are illustrative educational assumptions. They are not verified spacecraft performance predictions.</p>`;
  }

  function renderResults(d) {
    const metrics = [
      ['MODEL SCORE', `${d.score}/100`, 'Weighted educational design score'],
      ['SPACECRAFT MASS', `${fmt(d.mass)} kg`, `Model capacity ${fmt(d.capacity)} kg`],
      ['ESTIMATED COST', `$${fmt(d.cost)}M`, `Budget $${fmt(d.budget)}M`],
      ['POWER MARGIN', `${d.margin >= 0 ? '+' : ''}${fmt(d.margin)} kW`, `${fmt(d.demand)} kW demand · ${fmt(d.available)} kW available`],
      ['DATA GENERATED', `${fmt(d.generatedData)} GB`, `${fmt(d.dataRate)} GB/day`],
      ['RISK INDICATOR', `${d.risk}/100`, 'Higher means greater modelled risk'],
      ['BATTERY REQUIREMENT', `${fmt(d.batteryNeed)} kWh`, `${fmt(d.battery)} kWh configured`],
      ['CHECKS PASSED', `${d.passed}/6`, 'Simplified engineering checks']
    ];
    const failures = d.checks.filter((item) => !item.ok);
    const warningMarkup = failures.length
      ? `<div class="design-warning-list" role="alert" aria-live="assertive"><h3>Design needs attention — ${failures.length} issue${failures.length === 1 ? '' : 's'} found</h3><ul>${failures.map((item) => `<li><b>${escapeHTML(item.label)}:</b> ${escapeHTML(item.detail)}. Adjust this resource and run the analysis again.</li>`).join('')}</ul></div>`
      : `<div class="design-warning-list" style="border-color:#398b7d;border-left-color:#65e6d0;background:#153c38;color:#a0f3df" role="status"><h3 style="color:#a0f3df">No engineering errors detected</h3><ul><li>All six simplified engineering checks passed. Review assumptions before treating this as a real mission design.</li></ul></div>`;
    $('missionResults').innerHTML = `<div class="status ${d.go ? '' : 'review'}">${d.go ? 'ENGINEERING CHECKS: PASS' : 'ENGINEERING CHECKS: REVIEW REQUIRED'} · ${escapeHTML(d.name)}</div>${metrics.map(([label, value, note]) => `<div class="result"><small>${label}</small><b>${value}</b><p>${escapeHTML(note)}</p></div>`).join('')}<div class="status ${d.go ? '' : 'review'}">${d.checks.map((item) => `${item.label.toUpperCase()}: ${item.ok ? 'PASS' : 'REVIEW'}`).join(' · ')}</div>${warningMarkup}`;
    if (failures.length) showDesignerError(`Mission design needs attention: ${failures.map((item) => `${item.label} — ${item.detail}`).join('; ')}.`);
    else showDesignerError('');
  }

  function runMission() {
    const input = currentInput();
    const error = validateInput(input);
    if (error) {
      lastDesign = null;
      if (!$('designerError')?.textContent) showDesignerError(error);
      $('missionResults').innerHTML = `<div class="status review">${escapeHTML(error)}</div>`;
      return null;
    }
    const d = calculateModel({ ...input, ...input.common });
    lastDesign = d;
    saveDraft();
    autoSaveLatestMission();
    renderResults(d);
    drawResourceChart(d);
    renderReport(d);
    renderTimeline(d);
    award('first-analysis', 'First Mission Analysis', 25);
    if (d.go) award('engineering-clean-pass', 'Six-Check Engineering Pass', 50);
    evaluateChallenge(d);
    return d;
  }

  function renderComparison() {
    const common = readCommonInputs();
    const duration = Number($('duration').value);
    const budget = Number($('budget').value);
    const a = { name: 'Mission A', dest: $('aDest').value, rocket: Number($('aRocket').value), baseMass: Number($('aPayload').value), duration, budget, ...common };
    const b = { name: 'Mission B', dest: $('bDest').value, rocket: Number($('bRocket').value), baseMass: Number($('bPayload').value), duration, budget, ...common };
    for (const item of [a, b]) {
      const error = validateInput({ ...item, common });
      if (error) { $('comparisonResult').textContent = error; return; }
    }
    const modelA = calculateModel({ ...a, ...common });
    const modelB = calculateModel({ ...b, ...common });
    const card = (d) => `<div class="subpanel"><h3>${d.name} · ${destinationName[d.dest]}</h3><b class="compare-score">${d.score}/100</b><p>${d.go ? 'All six checks pass' : `${d.passed}/6 checks pass`}</p><div class="compare-line"><span>Mass</span><b>${fmt(d.mass)} / ${fmt(d.capacity)} kg</b></div><div class="compare-line"><span>Power margin</span><b>${fmt(d.margin)} kW</b></div><div class="compare-line"><span>Data link</span><b>${fmt(d.effectiveDownlink)} GB/day</b></div><div class="compare-line"><span>Cost</span><b>$${fmt(d.cost)}M</b></div><div class="compare-line"><span>Risk</span><b>${d.risk}/100</b></div></div>`;
    const winner = modelA.score === modelB.score ? 'Both concepts have equal model scores.' : modelA.score > modelB.score ? 'Mission A has the higher illustrative score.' : 'Mission B has the higher illustrative score.';
    $('comparisonResult').innerHTML = `<div class="grid two">${card(modelA)}${card(modelB)}</div><p class="comparison-verdict"><b>${winner}</b> <span class="muted">Both use the same selected spacecraft systems and resource settings.</span></p>`;
  }

  const events = [
    { name: 'Solar particle event', desc: 'A particle event prompts a temporary safe-mode period and increased power-management constraints.', effect: (d) => ({ pass: d.battery >= d.batteryNeed * 1.35, metric: 'Battery reserve', mitigation: 'Increase energy reserve, review safe-mode loads and consider radiation protection.' }) },
    { name: 'High data-volume discovery', desc: 'A new observation increases generated science data by 30%.', effect: (d) => ({ pass: d.dataCapacity >= d.storageNeed + d.dataRate * d.duration * 0.3, metric: 'Storage capacity', mitigation: 'Increase storage, reduce instrument duty cycle or improve downlink availability.' }) },
    { name: 'Communication outage', desc: 'A ground-station outage reduces effective downlink capacity by 40%.', effect: (d) => ({ pass: d.dataCapacity >= d.storageNeed + d.dataRate * d.duration * 0.4, metric: 'Data buffer', mitigation: 'Add relay coverage, schedule alternate ground stations or reduce data generation.' }) },
    { name: 'Budget reduction', desc: 'A late procurement change reduces the available budget by 12%.', effect: (d) => ({ pass: d.cost <= d.budget * 0.88, metric: 'Budget margin', mitigation: 'Revisit scope, payload selection and procurement assumptions.' }) },
    { name: 'Instrument degradation', desc: 'An instrument operates at reduced performance, lowering expected science return.', effect: (d) => ({ pass: d.science >= 45, metric: 'Science resilience', mitigation: 'Consider measurement redundancy, calibration plans and graceful degradation.' }) }
  ];

  function generateEvent() {
    const d = runMission();
    if (!d) { $('eventResult').textContent = 'Correct the mission inputs before generating an event.'; return; }
    const event = events[Math.floor(Math.random() * events.length)];
    const outcome = event.effect(d);
    lastEvent = { ...event, outcome };
    $('eventResult').innerHTML = `<div class="event-card"><small>CONTINGENCY SCENARIO · ${escapeHTML(outcome.metric)}</small><h3>${escapeHTML(event.name)}</h3><p>${escapeHTML(event.desc)}</p><strong class="${outcome.pass ? 'event-pass' : 'event-fail'}">${outcome.pass ? 'RESERVE APPEARS ADEQUATE IN THIS MODEL' : 'DESIGN NEEDS A MITIGATION'}</strong><p>${escapeHTML(outcome.mitigation)}</p><p class="hint">Scenario result is an illustrative stress test, not a physical event simulation.</p></div>`;
  }

  function reportText(d) {
    const compliance = complianceState();
    return [
      'ZENORA — MISSION DESIGN REPORT', `Mission: ${d.name}`, `Destination: ${destinationName[d.dest]}`, `Objective: ${d.objective}`, `Difficulty: ${d.difficulty}`,
      `Model score: ${d.score}/100`, `Engineering status: ${d.go ? 'PASS' : 'REVIEW REQUIRED'}`, `Checks passed: ${d.passed}/6`,
      `Mass: ${fmt(d.mass)} kg / ${fmt(d.capacity)} kg`, `Mass composition: ${fmt(d.baseMass)} kg base + ${fmt(d.instrumentMass)} kg instruments + ${fmt(d.subsystemAllowance)} kg subsystem allowance`,
      `Estimated cost: $${fmt(d.cost)}M / $${fmt(d.budget)}M`, `Power: ${fmt(d.demand)} kW demand / ${fmt(d.available)} kW available`,
      `Data: ${fmt(d.dataRate)} GB/day generated / ${fmt(d.effectiveDownlink)} GB/day effective downlink`, `Storage: ${fmt(d.dataCapacity)} GB configured / ${fmt(d.storageNeed)} GB modelled buffer requirement`,
      `Battery: ${fmt(d.battery)} kWh configured / ${fmt(d.batteryNeed)} kWh modelled requirement`, `Risk indicator: ${d.risk}/100`, `Compliance topics reviewed: ${compliance.done}/${compliance.total}`,
      '', 'Assumptions: Educational first-order estimates only. Not flight software, legal advice, certification or operational mission design.'
    ].join('\n');
  }

  function downloadReport() {
    if (!lastDesign) { alert('Run mission analysis first.'); return; }
    const blob = new Blob([reportText(lastDesign)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'ZENORA_Mission_Report.txt'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadExample() {
    $('missionName').value = 'Luna Relay Explorer'; $('destination').value = 'moon'; $('rocket').value = '300';
    $('payload').value = '350'; $('duration').value = '12'; $('budget').value = '450'; $('objective').value = 'exploration';
    $('difficulty').value = 'intermediate'; $('dataCapacity').value = '120'; $('downlink').value = '8'; $('battery').value = '24';
    document.querySelector('input[name="power"][value="hybrid"]').checked = true;
    document.querySelector('input[name="comms"][value="relay"]').checked = true;
    document.querySelectorAll('.instrument').forEach((item) => { item.checked = ['camera', 'spectrometer', 'magnetometer'].includes(item.value); });
    runMission();
  }

  function readWorkspaceState() {
    const state = {};
    document.querySelectorAll('#designer input, #designer select, #systems input, #systems select').forEach((el) => {
      if (!el.id && !el.classList.contains('instrument') && !el.name) return;
      if (el.type === 'radio') {
        if (el.checked) state[`radio:${el.name}`] = el.value;
      } else if (el.type === 'checkbox') {
        state[el.id || `instrument:${el.value}`] = el.checked;
      } else if (el.id) state[el.id] = el.value;
    });
    return state;
  }

  function applyWorkspaceState(state) {
    if (!state || typeof state !== 'object') return;
    document.querySelectorAll('#designer input, #designer select, #systems input, #systems select').forEach((el) => {
      if (el.type === 'radio') {
        const saved = state[`radio:${el.name}`];
        if (saved !== undefined) el.checked = el.value === saved;
      } else if (el.type === 'checkbox') {
        const key = el.id || `instrument:${el.value}`;
        if (typeof state[key] === 'boolean') el.checked = state[key];
      } else if (el.id && typeof state[el.id] === 'string') {
        el.value = state[el.id];
      }
    });
    $('teamMode')?.dispatchEvent(new Event('change'));
  }

  function getMissionLibrary() {
    try {
      const items = JSON.parse(localStorage.getItem(missionLibraryKey) || '[]');
      return Array.isArray(items) ? items.filter((item) => item && typeof item.id === 'string' && item.state) : [];
    } catch { return []; }
  }

  function refreshMissionLibrary(selectedId = '') {
    const select = $('missionLibrary');
    if (!select) return;
    const items = getMissionLibrary();
    select.replaceChildren();
    if (!items.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = 'No saved missions yet'; select.append(option);
    } else {
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Select a saved mission…'; select.append(placeholder);
      items.sort((a, b) => b.updatedAt - a.updatedAt).forEach((item) => {
        const option = document.createElement('option'); option.value = item.id;
        const stamp = new Date(item.updatedAt).toLocaleDateString();
        option.textContent = `${item.name || 'Untitled mission'} · ${stamp}`;
        select.append(option);
      });
      if (selectedId) select.value = selectedId;
    }
    $('loadSavedMission').disabled = !items.length;
    $('deleteSavedMission').disabled = !items.length;
  }

  function saveDraft() {
    try { localStorage.setItem(draftKey, JSON.stringify(readWorkspaceState())); } catch { /* Storage may be disabled. */ }
  }

  function autoSaveLatestMission() {
    const state = readWorkspaceState();
    const name = ($('missionName').value || '').trim() || 'Untitled mission';
    const items = getMissionLibrary();
    const existing = items.find((item) => item.id === activeMissionId) || items.find((item) => item.name === name);
    const record = { id: existing ? existing.id : `mission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, state, updatedAt: Date.now() };
    try {
      localStorage.setItem(missionLibraryKey, JSON.stringify([record, ...items.filter((item) => item.id !== record.id)].slice(0, 30)));
      localStorage.setItem(draftKey, JSON.stringify(state));
      activeMissionId = record.id;
      refreshMissionLibrary(record.id);
      if ($('workspaceStatus')) $('workspaceStatus').textContent = `Latest design “${name}” automatically saved to Mission Library.`;
    } catch {
      if ($('workspaceStatus')) $('workspaceStatus').textContent = 'Auto-save failed: browser storage is unavailable or full. Use Save mission or export your report.';
    }
  }

  function saveMission() {
    const state = readWorkspaceState();
    const name = ($('missionName').value || '').trim() || 'Untitled mission';
    const items = getMissionLibrary();
    const existing = items.find((item) => item.id === activeMissionId);
    const record = { id: existing ? existing.id : `mission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, state, updatedAt: Date.now() };
    const next = [record, ...items.filter((item) => item.id !== record.id)].slice(0, 30);
    try {
      localStorage.setItem(missionLibraryKey, JSON.stringify(next));
      localStorage.setItem(draftKey, JSON.stringify(state));
      activeMissionId = record.id;
      refreshMissionLibrary(record.id);
      $('workspaceStatus').textContent = `Saved “${name}” to your mission library. You can reopen and edit it anytime.`;
    } catch {
      $('workspaceStatus').textContent = 'Could not save: browser storage may be full or disabled. Export your report before closing.';
    }
  }

  function openSavedMission() {
    const id = $('missionLibrary').value;
    const record = getMissionLibrary().find((item) => item.id === id);
    if (!record) { $('workspaceStatus').textContent = 'Select a saved mission first.'; return; }
    activeChallenge = null;
    activeMissionId = record.id;
    applyWorkspaceState(record.state);
    $('workspaceStatus').textContent = `Opened “${record.name}”. All mission fields are editable; save again to update this library entry.`;
    runMission();
    window.scrollTo({ top: $('designer').offsetTop - 80, behavior: 'smooth' });
  }

  function deleteSavedMission() {
    const id = $('missionLibrary').value;
    if (!id) { $('workspaceStatus').textContent = 'Select a saved mission to delete.'; return; }
    const record = getMissionLibrary().find((item) => item.id === id);
    if (!record) return;
    const next = getMissionLibrary().filter((item) => item.id !== id);
    if (activeMissionId === id) activeMissionId = null;
    try { localStorage.setItem(missionLibraryKey, JSON.stringify(next)); } catch { /* Ignore storage errors. */ }
    refreshMissionLibrary();
    $('workspaceStatus').textContent = `Deleted “${record.name}” from the mission library. Your current design was not changed.`;
  }

  function newMission() {
    activeChallenge = null;
    activeMissionId = null;
    if ($('missionLibrary')) $('missionLibrary').value = '';
    lastDesign = null;
    lastEvent = null;
    $('missionName').value = 'New Mission'; $('destination').value = 'orbit'; $('rocket').value = '150';
    $('payload').value = '250'; $('duration').value = '30'; $('budget').value = '250';
    $('objective').value = 'science'; $('difficulty').value = 'beginner'; $('teamMode').value = 'solo';
    $('dataCapacity').value = '80'; $('downlink').value = '5'; $('battery').value = '12';
    document.querySelector('input[name="power"][value="solar"]').checked = true;
    document.querySelector('input[name="comms"][value="direct"]').checked = true;
    document.querySelectorAll('.instrument').forEach((item) => { item.checked = item.value === 'camera'; });
    ['sciencePriority', 'riskPriority'].forEach((id) => { if ($(id)) $(id).checked = true; });
    ['costPriority', 'powerPriority'].forEach((id) => { if ($(id)) $(id).checked = false; });
    $('teamMode').dispatchEvent(new Event('change'));
    $('missionResults').innerHTML = '<div class="panel empty">New mission ready. Edit the details and run mission analysis.</div>';
    $('reportContent').textContent = 'No analysis yet. Configure this mission and run an analysis.';
    $('timelineItems').innerHTML = '<div><small>READY</small><h3>New mission</h3><p>Configure your mission to generate an operations timeline.</p></div>';
    $('eventResult').textContent = 'No event generated yet.';
    const canvas = $('resourceChart'); if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    saveDraft();
    $('workspaceStatus').textContent = 'New mission created. Change any field and run a fresh analysis. Your career progress is preserved.';
    $('challengeMessage').textContent = 'You are designing a new mission outside the campaign challenges. Completed challenges and XP are preserved.';
    $('gameNotice').textContent = 'New mission workspace ready. Your commander career record is unchanged.';
    refreshMissionLibrary();
    document.querySelector('#designer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (saved) {
        applyWorkspaceState(saved);
        $('workspaceStatus').textContent = 'Restored your most recent mission draft. You can continue editing or create a new mission.';
        runMission();
      }
    } catch { /* Ignore malformed or unavailable browser storage. */ }
  }

  function initCompliance() {
    document.querySelectorAll('.compliance-check').forEach((item) => item.addEventListener('change', () => { const state = complianceState(); if (state.done === state.total) award('compliance-review', 'Mission Assurance Review', 30); if (lastDesign) renderReport(lastDesign); }));
    $('clearCompliance')?.addEventListener('click', () => { document.querySelectorAll('.compliance-check').forEach((item) => { item.checked = false; }); complianceState(); if (lastDesign) renderReport(lastDesign); });
    complianceState();
  }

  $('resetCareer')?.addEventListener('click', () => {
    const confirmed = window.confirm('Reset ZENORA career progress? This clears XP, rank, campaign completions and achievements for this version. Saved mission designs and older-version records will remain untouched.');
    if (!confirmed) return;
    career = { xp: 0, achievements: {}, completed: {} };
    activeChallenge = null;
    saveCareer();
    updateCareer();
    $('gameNotice').textContent = 'Career reset complete. Your ZENORA commander journey starts at Cadet.';
    $('challengeMessage').textContent = 'Career progress reset. Load a challenge to begin again.';
  });
  $('runMission').addEventListener('click', runMission);
  $('compareMissions').addEventListener('click', renderComparison);
  $('eventButton').addEventListener('click', generateEvent);
  $('loadExample').addEventListener('click', loadExample);
  $('resetMission').addEventListener('click', newMission);
  $('newMission').addEventListener('click', newMission);
  $('saveMission').addEventListener('click', saveMission);
  $('loadSavedMission').addEventListener('click', openSavedMission);
  $('deleteSavedMission').addEventListener('click', deleteSavedMission);
  $('downloadReport').addEventListener('click', downloadReport);
  $('teamMode').addEventListener('change', () => { $('teamPanel').style.display = $('teamMode').value === 'team' ? 'grid' : 'none'; });
  $('teamPanel').style.display = 'none';
  document.querySelectorAll('#designer input, #designer select, #systems input, #systems select').forEach((el) => {
    el.addEventListener('input', () => { if (el.classList.contains('field-invalid')) showDesignerError('Please correct the highlighted mission parameter.'); saveDraft(); });
    el.addEventListener('change', () => { if (el.classList.contains('field-invalid')) showDesignerError('Please correct the highlighted mission parameter.'); saveDraft(); });
  });
  const sidebarLinks = [...document.querySelectorAll('.sidebar nav a')];
  function syncSidebarActive() {
    const hash = location.hash || '#home';
    sidebarLinks.forEach((link) => {
      const active = link.getAttribute('href') === hash;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', syncSidebarActive);
  syncSidebarActive();

  initCompliance();
  updateCareer();
  refreshMissionLibrary();
  restoreDraft();

  const today = new Date();
  const dateString = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const start = new Date(today); start.setDate(start.getDate() - 2);
  $('neoStart').value = dateString(start); $('neoEnd').value = dateString(today);
  $('loadNasa').addEventListener('click', () => window.loadAsteroidData($('neoStart').value, $('neoEnd').value, $('nasaKey').value.trim() || 'DEMO_KEY'));

  // Every design field stays editable. Text/number fields update while typing;
  // selects, radios and checkboxes update as soon as the selection changes.
  function onWorkspaceEdit(item) {
    if (item.id === 'missionLibrary') return;
    if (activeChallenge) {
      activeChallenge = null;
      $('challengeMessage').textContent = 'Mission edited manually. Campaign attempt paused; your design remains editable. Load a challenge again to retry it.';
    }
    saveDraft();
    if (lastDesign) runMission();
    $('workspaceStatus').textContent = 'Unsaved changes in current mission. You can keep editing, run analysis again, or save this version.';
  }
  document.querySelectorAll('#designer input, #designer select, #systems input, #systems select').forEach((item) => {
    const eventName = item.type === 'text' || item.type === 'number' || item.type === 'password' ? 'input' : 'change';
    item.addEventListener(eventName, () => onWorkspaceEdit(item));
  });
})();
