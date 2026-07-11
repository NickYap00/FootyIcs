const selectEl = document.getElementById('team-select');
const triggerEl = document.getElementById('team-trigger');
const triggerValueEl = triggerEl.querySelector('.select-value');
const optionsEl = document.getElementById('team-options');
const statusEl = document.getElementById('status');
const actionsEl = document.getElementById('actions');
const fixturesEl = document.getElementById('fixtures');
const downloadAll = document.getElementById('download-all');
const subscribeLink = document.getElementById('subscribe-link');
const copyLink = document.getElementById('copy-link');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function setStatus(message, isError = false) {
  statusEl.textContent = message || '';
  statusEl.classList.toggle('error', isError);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function teamBadge(name, logo, extraClass = '') {
  const escaped = escapeHtml(name || 'TBD');
  const img = logo
    ? `<img class="team-logo ${extraClass}" src="${escapeHtml(logo)}" alt="" loading="lazy"
         onerror="this.remove()" />`
    : '';
  return `<span class="team">${img}${escaped}</span>`;
}

function openDropdown() {
  if (triggerEl.disabled) return;
  optionsEl.classList.remove('hidden');
  triggerEl.setAttribute('aria-expanded', 'true');
}

function closeDropdown() {
  optionsEl.classList.add('hidden');
  triggerEl.setAttribute('aria-expanded', 'false');
}

function selectTeam(id, name, logo) {
  triggerValueEl.innerHTML = teamBadge(name, logo);
  closeDropdown();
  loadFixtures(id);
}

async function loadTeams() {
  try {
    const res = await fetch('/api/teams');
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load teams');
    const teams = await res.json();

    optionsEl.innerHTML = teams
      .map(
        (t) =>
          `<li class="select-option" role="option"
             data-id="${escapeHtml(t.id)}"
             data-name="${escapeHtml(t.displayName)}"
             data-logo="${escapeHtml(t.logo || '')}">
             ${teamBadge(t.displayName, t.logo)}
           </li>`
      )
      .join('');

    optionsEl.querySelectorAll('.select-option').forEach((li) => {
      li.addEventListener('click', () =>
        selectTeam(li.dataset.id, li.dataset.name, li.dataset.logo || null)
      );
    });

    triggerValueEl.textContent = 'Select a team…';
    triggerEl.disabled = false;
    selectEl.setAttribute('aria-disabled', 'false');
    setStatus('');
  } catch (err) {
    setStatus(err.message, true);
  }
}

function renderFixtures(fixtures, teamId) {
  fixturesEl.innerHTML = '';
  for (const f of fixtures) {
    const li = document.createElement('li');
    li.className = 'fixture';

    const venue = [f.venueName, f.city].filter(Boolean).join(', ');
    const meta = [formatDate(f.dateISO), venue].filter(Boolean).join(' · ');

    const match = f.homeTeam && f.awayTeam
      ? `${teamBadge(f.homeTeam, f.homeLogo)}<span class="vs">vs</span>${teamBadge(f.awayTeam, f.awayLogo)}`
      : escapeHtml(f.summary);

    li.innerHTML = `
      <div class="fixture-info">
        <div class="fixture-match">${match}</div>
        <div class="fixture-meta">${meta} · ${escapeHtml(f.competition)}</div>
      </div>
      <a class="btn fixture-download"
         href="/api/ics/event?team=${encodeURIComponent(teamId)}&event=${encodeURIComponent(f.id)}"
         download>Add</a>
    `;
    fixturesEl.appendChild(li);
  }
}

function renderSkeleton(count = 5) {
  fixturesEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.className = 'fixture skeleton-fixture';
    li.setAttribute('aria-hidden', 'true');
    li.innerHTML = `
      <div class="fixture-info">
        <div class="fixture-match">
          <span class="skel skel-badge"></span>
          <span class="skel skel-vs"></span>
          <span class="skel skel-badge"></span>
        </div>
        <div class="fixture-meta">
          <span class="skel skel-meta"></span>
        </div>
      </div>
      <span class="skel skel-btn"></span>
    `;
    fixturesEl.appendChild(li);
  }
}

async function loadFixtures(teamId) {
  actionsEl.classList.add('hidden');
  fixturesEl.innerHTML = '';
  if (!teamId) {
    setStatus('');
    return;
  }
  setStatus('Loading fixtures…');
  renderSkeleton();
  try {
    const res = await fetch(`/api/fixtures?team=${encodeURIComponent(teamId)}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load fixtures');
    const fixtures = await res.json();

    if (fixtures.length === 0) {
      fixturesEl.innerHTML = '';
      setStatus('No upcoming fixtures found. Check back when the schedule is published.');
      return;
    }

    setStatus(`${fixtures.length} upcoming fixture${fixtures.length === 1 ? '' : 's'}.`);
    renderFixtures(fixtures, teamId);

    downloadAll.href = `/api/ics?team=${encodeURIComponent(teamId)}`;

    const httpsUrl = `${location.origin}/calendar/${encodeURIComponent(teamId)}.ics`;
    subscribeLink.href = httpsUrl.replace(/^https?:/, 'webcal:');
    copyLink.dataset.url = httpsUrl;

    actionsEl.classList.remove('hidden');
  } catch (err) {
    fixturesEl.innerHTML = '';
    setStatus(err.message, true);
  }
}

copyLink.addEventListener('click', async () => {
  const url = copyLink.dataset.url;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    const original = copyLink.textContent;
    copyLink.textContent = 'Copied!';
    setTimeout(() => (copyLink.textContent = original), 1500);
  } catch {
    setStatus(`Subscribe URL: ${url}`);
  }
});

triggerEl.addEventListener('click', () => {
  const isOpen = triggerEl.getAttribute('aria-expanded') === 'true';
  isOpen ? closeDropdown() : openDropdown();
});

document.addEventListener('click', (e) => {
  if (!selectEl.contains(e.target)) closeDropdown();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDropdown();
});

loadTeams();
