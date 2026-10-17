import { W, H, DESK_TOP, ROLES, drawRoom, drawStation, roleAt } from './sprites.js';

const LOOP_LIMIT = 3;
const HANDOFF_BUBBLE_MS = 6000;
const WORKS_REFRESH_MS = 5000;
const FRAME_MS = 280;

const STATUS_LABELS = {
  idle: 'Idle',
  working: 'Working',
  waiting: 'Waiting for you',
  blocked: 'Blocked',
  done: 'Done',
  stale: 'No report for 5+ min',
};

const $ = (id) => document.getElementById(id);
const els = {
  canvas: $('office-canvas'),
  tags: $('tags'),
  empty: $('empty'),
  select: $('work-select'),
  connection: $('connection'),
  connectionText: $('connection-text'),
  summary: $('work-summary'),
  panelTitle: $('panel-title'),
  panelName: $('panel-name'),
  panelStatus: $('panel-status'),
  panelAlert: $('panel-alert'),
  panelStage: $('panel-stage'),
  panelTask: $('panel-task'),
  panelLoop: $('panel-loop'),
  panelVerdict: $('panel-verdict'),
  panelUpdated: $('panel-updated'),
  activityList: $('activity-list'),
};

const app = {
  works: [],
  workId: new URLSearchParams(location.search).get('work'),
  snapshot: null,
  receivedAt: 0,
  selected: ROLES[0].id,
  source: null,
};

const ctx = els.canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const background = document.createElement('canvas');
background.width = W;
background.height = H;
drawRoom(background.getContext('2d'));

const tagButtons = new Map();
for (const role of ROLES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = `tag-${role.id}`;
  button.className = 'tag';
  button.style.left = `${(role.x / W) * 100}%`;
  button.style.top = `${((DESK_TOP + 31) / H) * 100}%`;
  const dot = document.createElement('span');
  dot.className = 'status-dot';
  dot.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = role.name;
  button.append(dot, label);
  button.addEventListener('click', () => select(role.id));
  els.tags.append(button);
  tagButtons.set(role.id, button);
}

els.canvas.addEventListener('click', (event) => {
  const rect = els.canvas.getBoundingClientRect();
  const role = roleAt(((event.clientX - rect.left) / rect.width) * W);
  if (role) select(role.id);
});

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLSelectElement) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const index = ROLES.findIndex((r) => r.id === app.selected);
  const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + ROLES.length) % ROLES.length;
  select(ROLES[next].id);
  tagButtons.get(ROLES[next].id).focus();
});

els.select.addEventListener('change', () => openWork(els.select.value));

function select(roleId) {
  app.selected = roleId;
  renderPanel();
  renderTags();
}

function agentOf(roleId) {
  return app.snapshot?.state?.agents?.[roleId];
}

function displayStatus(agent) {
  if (!agent) return 'idle';
  return agent.stale ? 'stale' : agent.status;
}

function serverNow() {
  if (!app.snapshot) return Date.now();
  return Date.parse(app.snapshot.serverTime) + (Date.now() - app.receivedAt);
}

function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.round((serverNow() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

function roleName(id) {
  return ROLES.find((r) => r.id === id)?.name ?? id;
}

function renderTags() {
  for (const role of ROLES) {
    const button = tagButtons.get(role.id);
    const status = displayStatus(agentOf(role.id));
    button.dataset.status = status;
    button.setAttribute('aria-pressed', String(role.id === app.selected));
    button.setAttribute('aria-label', `${role.name}: ${STATUS_LABELS[status]}`);
  }
  const summary = ROLES.map((r) => `${r.name} ${STATUS_LABELS[displayStatus(agentOf(r.id))]}`).join(', ');
  els.canvas.setAttribute('aria-label', `Office with five agents. ${summary}.`);
}

function renderPanel() {
  const role = ROLES.find((r) => r.id === app.selected);
  const agent = agentOf(role.id);
  const status = displayStatus(agent);

  els.panelTitle.textContent = role.title;
  els.panelName.textContent = role.name;
  els.panelStatus.textContent = STATUS_LABELS[status];
  els.panelStatus.dataset.status = status;
  els.panelStage.textContent = agent?.stage ?? '—';
  els.panelTask.textContent = agent?.task || '—';
  els.panelLoop.textContent = agent?.loop ? `Loop ${agent.loop} of ${LOOP_LIMIT}` : '—';
  els.panelVerdict.textContent = agent?.verdict ?? '—';
  els.panelVerdict.className = agent?.verdict ? 'mono' : '';
  els.panelUpdated.textContent = timeAgo(agent?.lastEventAt);

  let alert = '';
  if (agent?.escalated) alert = 'Loop limit reached. The team needs your decision.';
  else if (status === 'waiting') alert = 'Waiting for your answer or approval in your AI tool.';
  else if (status === 'stale') alert = 'Working, but no status report for over 5 minutes. The agent may have stopped or forgotten to report.';
  else if (app.snapshot?.state?.pendingHandoffTo === role.id && status === 'idle') {
    alert = 'Next up — handed off and ready to start.';
  } else if (agent?.handoff && serverNow() - Date.parse(agent.handoff.at) < HANDOFF_BUBBLE_MS) {
    alert = `Handed off to ${roleName(agent.handoff.to)}.`;
  }
  els.panelAlert.textContent = alert;
  els.panelAlert.hidden = !alert;
}

function formatEventTag(e) {
  if (e.event === 'verdict' && e.verdict) return e.verdict;
  if (e.event === 'loop' && e.loop) return `loop ${e.loop}`;
  if (e.event === 'handoff' && e.to) return `→ ${roleName(e.to)}`;
  return e.event;
}

function renderActivity() {
  if (!els.activityList) return;
  const recent = app.snapshot?.state?.recentEvents ?? [];
  if (recent.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'activity-empty';
    emptyItem.textContent = 'No events yet.';
    els.activityList.replaceChildren(emptyItem);
    return;
  }

  const items = recent.map((e) => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.addEventListener('click', () => select(e.agent));

    const header = document.createElement('div');
    header.className = 'activity-item-head';

    const agentSpan = document.createElement('span');
    agentSpan.className = 'activity-agent';
    agentSpan.textContent = roleName(e.agent);

    const typeSpan = document.createElement('span');
    typeSpan.className = 'activity-type';
    typeSpan.dataset.event = e.event;
    typeSpan.textContent = formatEventTag(e);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'activity-time';
    timeSpan.textContent = timeAgo(e.ts);

    header.append(agentSpan, typeSpan, timeSpan);
    li.append(header);

    if (e.message) {
      const msg = document.createElement('p');
      msg.className = 'activity-msg';
      msg.textContent = e.message;
      li.append(msg);
    }

    return li;
  });

  els.activityList.replaceChildren(...items);
}

function renderSummary() {
  const state = app.snapshot?.state;
  if (!state || !state.workId) {
    els.summary.textContent = app.workId ? 'No events for this work item yet.' : '';
    els.summary.dataset.done = 'false';
    return;
  }
  els.summary.dataset.done = String(state.done);
  els.summary.textContent = state.done
    ? `Done${state.summary ? `: ${state.summary}` : ''}`
    : `Stage: ${state.stage ?? '—'} · ${state.eventCount} events · updated ${timeAgo(state.lastEventAt)}`;
}

function setConnection(state, text) {
  els.connection.dataset.state = state;
  els.connectionText.textContent = text;
}

function draw(time) {
  const frame = Math.floor(time / FRAME_MS);
  const now = serverNow();
  ctx.drawImage(background, 0, 0);
  for (const role of ROLES) {
    const agent = agentOf(role.id);
    const handoffActive = Boolean(agent?.handoff) && now - Date.parse(agent.handoff.at) < HANDOFF_BUBBLE_MS;
    drawStation(ctx, role, agent, { frame, selected: role.id === app.selected, handoffActive });
  }
  requestAnimationFrame(draw);
}

function applySnapshot(snapshot) {
  app.snapshot = snapshot;
  app.receivedAt = Date.now();
  renderTags();
  renderPanel();
  renderSummary();
  renderActivity();
}

function openWork(workId) {
  if (app.source) app.source.close();
  app.workId = workId;
  app.snapshot = null;
  const url = new URL(location.href);
  url.searchParams.set('work', workId);
  history.replaceState(null, '', url);

  setConnection('connecting', 'Connecting');
  const source = new EventSource(`/stream?work=${encodeURIComponent(workId)}`);
  app.source = source;
  source.addEventListener('state', (event) => {
    try {
      applySnapshot(JSON.parse(event.data));
    } catch {
      setConnection('offline', 'Bad data');
    }
  });
  source.addEventListener('open', () => setConnection('live', 'Live'));
  source.addEventListener('error', () => setConnection('offline', 'Reconnecting'));
  applySnapshot(null);
}

function renderWorkOptions() {
  const current = app.workId;
  els.select.replaceChildren(
    ...app.works.map((work) => {
      const option = document.createElement('option');
      option.value = work.workId;
      option.textContent = work.workId;
      return option;
    }),
  );
  if (current && !app.works.some((w) => w.workId === current)) {
    const option = document.createElement('option');
    option.value = current;
    option.textContent = `${current} (no events)`;
    els.select.prepend(option);
  }
  if (current) els.select.value = current;
  els.select.disabled = els.select.options.length === 0;
  els.empty.hidden = app.works.length > 0 || Boolean(current);
}

async function refreshWorks() {
  try {
    const response = await fetch('/api/works', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const { works } = await response.json();
    app.works = Array.isArray(works) ? works : [];
    if (!app.workId && app.works.length > 0) openWork(app.works[0].workId);
    else if (app.works.length === 0 && !app.workId) setConnection('connecting', 'Waiting for work');
    renderWorkOptions();
  } catch {
    if (!app.source) setConnection('offline', 'Server unreachable');
  }
}

setInterval(() => {
  renderPanel();
  renderSummary();
  renderActivity();
}, 1000);
setInterval(refreshWorks, WORKS_REFRESH_MS);

renderTags();
renderPanel();
renderActivity();
if (app.workId) openWork(app.workId);
refreshWorks();
requestAnimationFrame(draw);
