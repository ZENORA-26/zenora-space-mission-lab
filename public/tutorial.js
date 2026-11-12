(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const overlay = $('tutorialOverlay');
  if (!overlay) return;
  const steps = [
    { title: 'Welcome to ZENORA', text: 'ZENORA is an educational space-mission lab. You can design a mission, configure spacecraft systems, simulate trade-offs and review the results.', tip: 'This short tour takes about two minutes. You can close it at any time.', target: '#home', label: 'WELCOME' },
    { title: 'Mission Designer', text: 'Start here. Enter a mission name, choose a destination and launcher, then set payload mass, duration and budget.', tip: 'Begin with a simple mission. You can save several designs in your Mission Library.', target: '#designer', label: 'DESIGN A MISSION' },
    { title: 'Spacecraft Systems', text: 'Choose science instruments, power architecture and communications. These choices affect mass, power demand and data generation.', tip: 'Try changing one system at a time to understand its effect on the mission.', target: '#systems', label: 'CONFIGURE SYSTEMS' },
    { title: 'Run Mission Analysis', text: 'Return to the Designer and select “Run mission analysis”. ZENORA evaluates the modelled mass, budget, power, data storage, downlink and battery reserve.', tip: 'If a check fails, read the alert: it should identify the failed requirement and show the measured value.', target: '#runMission', label: 'CHECK FEASIBILITY' },
    { title: 'Campaign Challenges', text: 'Campaign provides guided mission challenges. Select a challenge, review its objective and use the mission designer to meet its requirements.', tip: 'If a challenge does not start, note its name and any message shown so it can be diagnosed.', target: '#campaign', label: 'LEARN BY CHALLENGE' },
    { title: 'Compare and Simulate', text: 'Use Compare to evaluate alternative designs, then Simulation to explore the modelled mission outcome and resource trade-offs.', tip: 'Compare two saved designs to see how changing mass, power or budget affects the result.', target: '#compare', label: 'TEST OPTIONS' },
    { title: 'Orbit Lab and NASA Data', text: 'Orbit Lab introduces orbital calculations. NASA Data retrieves near-Earth object information when the API is available.', tip: 'These are learning tools; model estimates are not certified flight-planning data.', target: '#orbital', label: 'EXPLORE SPACE DATA' },
    { title: 'Teamwork and Reports', text: 'Use Team for room-based collaboration and Report to review or export your mission summary. Timeline and Compliance help organize and review the plan.', tip: 'You are ready to explore. Select “Take the tour” in the sidebar whenever you want to see these steps again.', target: '#report', label: 'SHARE YOUR WORK' }
  ];
  let index = 0;
  let lastFocus = null;
  function clearFocus() { document.querySelectorAll('.tutorial-focus').forEach((el) => el.classList.remove('tutorial-focus')); }
  function render() {
    const step = steps[index];
    $('tutorialStepLabel').textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')} · ${step.label}`;
    $('tutorialTitle').textContent = step.title;
    $('tutorialText').textContent = step.text;
    $('tutorialTip').textContent = step.tip;
    $('tutorialProgress').style.width = `${((index + 1) / steps.length) * 100}%`;
    $('tutorialBack').disabled = index === 0;
    $('tutorialNext').textContent = index === steps.length - 1 ? 'Finish tour ✓' : index === 0 ? 'Start tour ↗' : 'Next ↗';
    clearFocus();
    const target = document.querySelector(step.target);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('tutorial-focus');
    }
  }
  function close(markComplete) {
    overlay.hidden = true;
    clearFocus();
    if (markComplete) { try { localStorage.setItem('zenora_tutorial_seen_v1', '1'); } catch (_) {} }
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  function open() { lastFocus = document.activeElement; index = 0; overlay.hidden = false; render(); $('tutorialNext').focus(); }
  $('startTutorial')?.addEventListener('click', open);
  $('tutorialClose')?.addEventListener('click', () => close(true));
  $('tutorialSkip')?.addEventListener('click', () => close(true));
  $('tutorialBack')?.addEventListener('click', () => { if (index > 0) { index -= 1; render(); } });
  $('tutorialNext')?.addEventListener('click', () => { if (index < steps.length - 1) { index += 1; render(); } else close(true); });
  overlay.addEventListener('click', (event) => { if (event.target.classList.contains('tutorial-backdrop')) close(true); });
  document.addEventListener('keydown', (event) => { if (!overlay.hidden && event.key === 'Escape') close(true); });
  let seen = false;
  try { seen = localStorage.getItem('zenora_tutorial_seen_v1') === '1'; } catch (_) {}
  if (!seen) window.setTimeout(open, 700);
})();
