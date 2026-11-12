'use strict';

window.loadAsteroidData = async function loadAsteroidData(start, end, key) {
  const status = document.getElementById('nasaStatus');
  const summary = document.getElementById('asteroidSummary');
  const list = document.getElementById('asteroidList');
  summary.replaceChildren(); list.replaceChildren();
  if (!start || !end || start > end) { status.textContent = 'Choose a valid date range.'; return; }
  const span = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
  if (span > 6) { status.textContent = 'Choose a maximum seven-calendar-day range (start and end dates included).'; return; }
  if (new Date(`${start}T00:00:00Z`) > new Date()) { status.textContent = 'The start date cannot be in the future.'; return; }
  status.textContent = 'Connecting to NASA NeoWs…';
  try {
    const endpoint = new URL('https://api.nasa.gov/neo/rest/v1/feed');
    endpoint.searchParams.set('start_date', start);
    endpoint.searchParams.set('end_date', end);
    endpoint.searchParams.set('api_key', key || 'DEMO_KEY');
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      if (response.status === 429) throw new Error('NASA rate limit reached. Wait or use your own API key.');
      if (response.status === 403) throw new Error('NASA rejected the API key. Check the key and try again.');
      throw new Error(`NASA API returned HTTP ${response.status}.`);
    }
    const data = await response.json();
    const objects = Object.values(data.near_earth_objects || {}).flat();
    objects.sort((a, b) => Number(a.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity) - Number(b.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity));
    const hazardous = objects.filter((item) => item.is_potentially_hazardous_asteroid).length;
    const addPill = (value, label) => {
      const pill = document.createElement('div'); pill.className = 'pill';
      const strong = document.createElement('b'); strong.textContent = String(value);
      pill.append(strong, document.createTextNode(label)); summary.append(pill);
    };
    addPill(objects.length, 'Objects found'); addPill(hazardous, 'Flagged potentially hazardous'); addPill(data.element_count ?? objects.length, 'Total API count');
    if (!objects.length) { status.textContent = 'No objects returned for this date range.'; return; }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const header = document.createElement('tr');
    ['ASTEROID', 'CLOSE APPROACH (UTC)', 'MISS DISTANCE', 'RELATIVE SPEED', 'MAX DIAMETER', 'NASA FLAG'].forEach((label) => {
      const th = document.createElement('th'); th.textContent = label; header.append(th);
    });
    thead.append(header); table.append(thead);
    const tbody = document.createElement('tbody');
    objects.slice(0, 40).forEach((asteroid) => {
      const close = asteroid.close_approach_data?.[0] || {};
      const diameter = asteroid.estimated_diameter?.meters?.estimated_diameter_max;
      const values = [
        asteroid.name || 'Unnamed', close.close_approach_date_full || close.close_approach_date || '—',
        `${Number(close.miss_distance?.kilometers || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} km`,
        `${Number(close.relative_velocity?.kilometers_per_hour || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} km/h`,
        diameter ? `${Number(diameter).toFixed(1)} m` : '—',
        asteroid.is_potentially_hazardous_asteroid ? 'Potentially hazardous' : 'Not flagged'
      ];
      const row = document.createElement('tr');
      values.forEach((value, index) => {
        const cell = document.createElement('td'); cell.textContent = value;
        if (index === 5 && asteroid.is_potentially_hazardous_asteroid) cell.className = 'risk';
        row.append(cell);
      });
      tbody.append(row);
    });
    table.append(tbody); list.append(table);
    status.textContent = `NASA data loaded for ${start} to ${end}. Showing up to 40 objects. A potentially hazardous classification is not a prediction of impact.`;
  } catch (error) {
    status.textContent = `Unable to load NASA data: ${error.message}`;
  }
};
