'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const MU_EARTH = 398600.4418; // km^3/s^2
  const R_EARTH = 6378.137; // km
  const AU = 149597870.7; // km
  const MU_SUN = 1.32712440018e11; // km^3/s^2
  const DAY = 86400;
  const fmt = (n, digits = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
  let frame = 0;
  let animationId = null;
  let visible = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function metric(label, value, unit, note = '') {
    return `<div class="orbit-metric"><small>${label}</small><b>${value}</b><span>${unit}${note ? ` · ${note}` : ''}</span></div>`;
  }

  function calculate() {
    const scenario = $('orbScenario').value;
    const altitude = Number($('orbAltitude').value);
    if (!Number.isFinite(altitude) || altitude < 160 || altitude > 2000) {
      $('orbResults').innerHTML = '<div class="empty">Enter a parking-orbit altitude between 160 km and 2,000 km.</div>';
      draw({ scenario });
      return;
    }
    const r = R_EARTH + altitude;
    let html = '';
    const data = { scenario, altitude };

    if (scenario === 'leo') {
      const velocity = Math.sqrt(MU_EARTH / r);
      const periodSeconds = 2 * Math.PI * Math.sqrt((r ** 3) / MU_EARTH);
      const periodMinutes = periodSeconds / 60;
      html = metric('Circular velocity', `${fmt(velocity, 3)} km/s`, 'Ideal two-body speed')
        + metric('Orbital period', `${fmt(periodMinutes, 1)} min`, 'One complete revolution')
        + metric('Orbit radius', `${fmt(r, 1)} km`, 'Earth centre to spacecraft')
        + metric('Specific orbital energy', `${fmt(-MU_EARTH / (2 * r), 3)}`, 'km²/s²');
      Object.assign(data, { velocity, periodMinutes });
    } else if (scenario === 'moon') {
      const periapsis = r;
      const apoapsis = 384400;
      const semiMajor = (periapsis + apoapsis) / 2;
      const circularSpeed = Math.sqrt(MU_EARTH / periapsis);
      const transferPeriapsisSpeed = Math.sqrt(MU_EARTH * (2 / periapsis - 1 / semiMajor));
      const transferApoapsisSpeed = Math.sqrt(MU_EARTH * (2 / apoapsis - 1 / semiMajor));
      const circularSpeedAtLunarRadius = Math.sqrt(MU_EARTH / apoapsis);
      const transferDays = Math.PI * Math.sqrt((semiMajor ** 3) / MU_EARTH) / DAY;
      html = metric('Ideal transfer time', `${fmt(transferDays, 1)} days`, 'Half-period transfer ellipse')
        + metric('Departure Δv', `${fmt(transferPeriapsisSpeed - circularSpeed, 3)} km/s`, 'Impulsive Earth-centred estimate')
        + metric('Speed at lunar distance', `${fmt(transferApoapsisSpeed, 3)} km/s`, 'Earth-centred transfer speed')
        + metric('Circular reference speed', `${fmt(circularSpeedAtLunarRadius, 3)} km/s`, 'At lunar mean distance');
      Object.assign(data, { transferDays });
    } else {
      const earthOrbit = AU;
      const marsOrbit = 1.523679 * AU;
      const semiMajor = (earthOrbit + marsOrbit) / 2;
      const earthSpeed = Math.sqrt(MU_SUN / earthOrbit);
      const marsSpeed = Math.sqrt(MU_SUN / marsOrbit);
      const transferAtEarth = Math.sqrt(MU_SUN * (2 / earthOrbit - 1 / semiMajor));
      const transferAtMars = Math.sqrt(MU_SUN * (2 / marsOrbit - 1 / semiMajor));
      const transferDays = Math.PI * Math.sqrt((semiMajor ** 3) / MU_SUN) / DAY;
      const marsPeriodDays = 365.256 * Math.sqrt(1.523679 ** 3);
      const phaseAngle = (180 - 360 * transferDays / marsPeriodDays + 360) % 360;
      html = metric('Ideal transfer time', `${fmt(transferDays, 1)} days`, 'Hohmann transfer half-period')
        + metric('Earth departure v∞ scale', `${fmt(Math.abs(transferAtEarth - earthSpeed), 2)} km/s`, 'Heliocentric velocity difference')
        + metric('Mars arrival v∞ scale', `${fmt(Math.abs(marsSpeed - transferAtMars), 2)} km/s`, 'Heliocentric velocity difference')
        + metric('Approx. departure phase', `${fmt(phaseAngle, 1)}°`, 'Mars lead angle in this ideal model');
      Object.assign(data, { transferDays, phaseAngle });
    }
    $('orbResults').innerHTML = html;
    draw(data);
  }

  function draw(data) {
    const canvas = $('orbitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#071523'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#173149'; ctx.lineWidth = 1;
    for (let x = 20; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 20; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    const circle = (x, y, radius, color, dash = []) => { ctx.beginPath(); ctx.setLineDash(dash); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); };
    const planet = (x, y, radius, color, label) => {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = '#e8f3ff'; ctx.font = '13px Arial'; ctx.fillText(label, x + radius + 8, y + 4);
    };
    if (data.scenario === 'leo') {
      const x = 380, y = 215, orbitRadius = 116;
      circle(x, y, orbitRadius, '#4b9ac0', [5, 5]); planet(x, y, 48, '#2876a8', 'Earth');
      const angle = reduceMotion ? 0.5 : frame * 0.018;
      planet(x + orbitRadius * Math.cos(angle), y + orbitRadius * Math.sin(angle), 7, '#70e6d1', 'Spacecraft');
      ctx.fillStyle = '#a9c3d9'; ctx.fillText(`Circular orbit · ${fmt(data.altitude || 400, 0)} km altitude`, 24, 34);
    } else if (data.scenario === 'moon') {
      const x = 210, y = 220;
      planet(x, y, 43, '#2876a8', 'Earth'); circle(x, y, 160, '#536c83', [5, 5]);
      ctx.beginPath(); ctx.ellipse(x + 12, y, 160, 88, 0, Math.PI, Math.PI * 2); ctx.strokeStyle = '#70e6d1'; ctx.lineWidth = 3; ctx.stroke();
      planet(x + 160, y, 13, '#aaaeb7', 'Moon');
      const angle = reduceMotion ? 0.6 : frame * 0.012;
      planet(x + 12 + 160 * Math.cos(angle), y - 88 * Math.sin(angle), 6, '#70e6d1', 'Transfer');
      ctx.fillStyle = '#a9c3d9'; ctx.fillText('Earth-centred transfer schematic · not to scale', 24, 34);
    } else {
      const x = 380, y = 215;
      planet(x, y, 15, '#e8bc69', 'Sun'); circle(x, y, 85, '#3d86b3'); circle(x, y, 155, '#a65d4c');
      planet(x + 85, y, 7, '#4c9ad0', 'Earth'); planet(x - 155, y, 9, '#c56f56', 'Mars');
      ctx.beginPath(); ctx.ellipse(x - 35, y, 120, 70, 0, Math.PI, Math.PI * 2); ctx.strokeStyle = '#70e6d1'; ctx.lineWidth = 3; ctx.stroke();
      const angle = reduceMotion ? 0.7 : frame * 0.008;
      planet(x + 120 * Math.cos(angle), y - 70 * Math.sin(angle), 5, '#70e6d1', 'Transfer');
      ctx.fillStyle = '#a9c3d9'; ctx.fillText('Heliocentric Hohmann transfer schematic · not to scale', 24, 34);
    }
  }

  function stopAnimation() { if (animationId) cancelAnimationFrame(animationId); animationId = null; }
  function animate() {
    stopAnimation();
    if (!visible || document.hidden || reduceMotion) return;
    frame += 1;
    draw({ scenario: $('orbScenario').value, altitude: Number($('orbAltitude').value) || 400 });
    animationId = requestAnimationFrame(animate);
  }

  window.orbitalRefresh = calculate;
  $('orbCalculate').addEventListener('click', calculate);
  $('orbScenario').addEventListener('change', calculate);
  $('orbAltitude').addEventListener('change', calculate);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) animate(); else stopAnimation();
    }, { threshold: 0.1 });
    observer.observe($('orbital'));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAnimation(); else if (visible) animate(); });
  calculate();
  if (!reduceMotion) animate();
})();
