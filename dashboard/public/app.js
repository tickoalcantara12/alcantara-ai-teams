import {
  W,
  H,
  DESK_TOP,
  ROLES,
  drawRoom,
  drawClock,
  drawStation,
  isRoaming,
  getRoamerPose,
  drawRoamer,
  roleAt,
  pickActiveWork,
  createArcadeAudio,
  isAgentFree,
  generateAgentReply,
} from './sprites.js';

const LOOP_LIMIT = 3;
const HANDOFF_BUBBLE_MS = 6000;
const CHAT_BUBBLE_MS = 5000;
const WORKS_REFRESH_MS = 2500;
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
  dropdown: $('work-dropdown'),
  trigger: $('work-trigger'),
  triggerLabel: $('work-trigger-label'),
  menu: $('work-menu'),
  soundToggle: $('sound-toggle'),
  soundLabel: $('sound-label'),
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
  chatBadge: $('chat-badge'),
  chatMessages: $('chat-messages'),
  chatPrompts: $('chat-prompts'),
  chatForm: $('chat-form'),
  chatInput: $('chat-input'),
  chatSend: $('chat-send'),
  activityList: $('activity-list'),
};

const savedSound = localStorage.getItem('ai-team-sfx');
const sfx = createArcadeAudio({ enabled: savedSound === null ? true : savedSound === '1' });

const app = {
  works: [],
  workId: new URLSearchParams(location.search).get('work'),
  snapshot: null,
  receivedAt: 0,
  selected: ROLES[0].id,
  source: null,
  lastTime: 0,
  userSelected: false,
  lastTopKey: null,
  lastEventCount: 0,
  chats: Object.fromEntries(ROLES.map((r) => [r.id, []])),
  chatUntil: {},
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
  const lx = ((event.clientX - rect.left) / rect.width) * W;
  const ly = ((event.clientY - rect.top) / rect.height) * H;
  const role = roleAt(lx, ly, app.snapshot?.state?.agents, app.lastTime);
  if (role) select(role.id);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && els.menu && !els.menu.hidden) {
    closeDropdown();
    return;
  }
  if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const index = ROLES.findIndex((r) => r.id === app.selected);
  const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + ROLES.length) % ROLES.length;
  select(ROLES[next].id);
  tagButtons.get(ROLES[next].id).focus();
});

els.select.addEventListener('change', () => {
  app.userSelected = true;
  openWork(els.select.value);
});

if (els.trigger) {
  els.trigger.addEventListener('click', () => {
    if (els.trigger.disabled) return;
    const willOpen = els.menu.hidden;
    els.menu.hidden = !willOpen;
    els.trigger.setAttribute('aria-expanded', String(willOpen));
    sfx.play('select');
  });
}

document.addEventListener('click', (event) => {
  if (els.dropdown && !els.dropdown.contains(event.target)) {
    closeDropdown();
  }
});

function closeDropdown() {
  if (!els.menu || !els.trigger) return;
  els.menu.hidden = true;
  els.trigger.setAttribute('aria-expanded', 'false');
}

function updateSoundButton() {
  if (!els.soundToggle || !els.soundLabel) return;
  els.soundToggle.setAttribute('aria-pressed', String(sfx.enabled));
  els.soundLabel.textContent = sfx.enabled ? '8-bit SFX: ON' : '8-bit SFX: OFF';
}

if (els.soundToggle) {
  updateSoundButton();
  els.soundToggle.addEventListener('click', () => {
    const on = sfx.toggle();
    localStorage.setItem('ai-team-sfx', on ? '1' : '0');
    updateSoundButton();
  });
}

if (els.chatForm) {
  els.chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendChatMessage(els.chatInput.value);
    els.chatInput.value = '';
  });
}

if (els.chatPrompts) {
  els.chatPrompts.addEventListener('click', (event) => {
    const btn = event.target.closest('.chat-chip');
    if (!btn || btn.disabled) return;
    sendChatMessage(btn.dataset.prompt || '');
  });
}

function sendChatMessage(rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) return;
  const roleId = app.selected;
  const agent = agentOf(roleId);
  if (!isAgentFree(agent)) return;

  const history = app.chats[roleId];
  history.push({ sender: 'user', text });
  const reply = generateAgentReply(roleId, text, app.snapshot?.state);
  history.push({ sender: 'agent', text: reply });
  if (history.length > 20) history.splice(0, history.length - 20);

  app.chatUntil[roleId] = Date.now() + CHAT_BUBBLE_MS;
  sfx.play('chat');
  renderChat();
}

function select(roleId) {
  const changed = app.selected !== roleId;
  app.selected = roleId;
  if (changed) sfx.play('select');
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
  renderChat();
}

function renderChat() {
  if (!els.chatMessages) return;
  const role = ROLES.find((r) => r.id === app.selected);
  const agent = agentOf(role.id);
  const free = isAgentFree(agent);

  if (els.chatBadge) {
    els.chatBadge.dataset.free = String(free);
    els.chatBadge.textContent = free ? 'Free to chat' : 'Busy working';
  }
  if (els.chatInput) {
    els.chatInput.disabled = !free;
    els.chatInput.placeholder = free
      ? `Chat with ${role.name}…`
      : `${role.name} is busy — select a free agent to chat`;
  }
  if (els.chatSend) els.chatSend.disabled = !free;
  if (els.chatPrompts) {
    for (const chip of els.chatPrompts.querySelectorAll('.chat-chip')) {
      chip.disabled = !free;
    }
  }

  const history = app.chats[role.id] ?? [];
  if (history.length === 0) {
    const greeting = document.createElement('div');
    greeting.className = 'chat-msg';
    greeting.dataset.sender = 'agent';
    greeting.textContent = free
      ? generateAgentReply(role.id, 'hi', app.snapshot?.state)
      : `${role.name} is focused on "${agent?.task || app.snapshot?.state?.stage || 'current work'}". Pick any idle agent strolling the office to chat!`;
    els.chatMessages.replaceChildren(greeting);
    return;
  }

  const nodes = history.map((msg) => {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.dataset.sender = msg.sender;
    div.textContent = msg.sender === 'agent' ? `${role.name}: ${msg.text}` : msg.text;
    return div;
  });
  els.chatMessages.replaceChildren(...nodes);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
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
  app.lastTime = time;
  const frame = Math.floor(time / FRAME_MS);
  const now = serverNow();
  ctx.drawImage(background, 0, 0);
  drawClock(ctx, new Date());

  const roamers = [];
  for (const role of ROLES) {
    const agent = agentOf(role.id);
    const handoffActive = Boolean(agent?.handoff) && now - Date.parse(agent.handoff.at) < HANDOFF_BUBBLE_MS;
    if (isRoaming(agent, handoffActive)) {
      roamers.push({ role, pose: getRoamerPose(role.id, time) });
    }
  }
  roamers.sort((a, b) => a.pose.y - b.pose.y);

  for (const { role, pose } of roamers) {
    if (pose.y < DESK_TOP) {
      const chatActive = (app.chatUntil[role.id] ?? 0) > Date.now();
      drawRoamer(ctx, role, { time, frame, selected: role.id === app.selected, chatActive });
    }
  }
  for (const role of ROLES) {
    const agent = agentOf(role.id);
    const handoffActive = Boolean(agent?.handoff) && now - Date.parse(agent.handoff.at) < HANDOFF_BUBBLE_MS;
    const chatActive = (app.chatUntil[role.id] ?? 0) > Date.now();
    drawStation(ctx, role, agent, { frame, selected: role.id === app.selected, handoffActive, chatActive });
  }
  for (const { role, pose } of roamers) {
    if (pose.y >= DESK_TOP) {
      const chatActive = (app.chatUntil[role.id] ?? 0) > Date.now();
      drawRoamer(ctx, role, { time, frame, selected: role.id === app.selected, chatActive });
    }
  }
  requestAnimationFrame(draw);
}

function playEventSound(prevCount, nextState) {
  const count = nextState?.eventCount ?? 0;
  if (!nextState || count <= prevCount) return;
  const latest = nextState.recentEvents?.[0];
  if (!latest) return;
  if (latest.event === 'done') sfx.play('done');
  else if (latest.event === 'handoff') sfx.play('handoff');
  else if (latest.event === 'gate_waiting' || latest.event === 'escalated') sfx.play('waiting');
  else if (latest.event === 'verdict') {
    const bad = ['CHANGES_REQUESTED', 'BLOCKED', 'FAIL', 'GAPS_FOUND'].includes(latest.verdict);
    sfx.play(bad ? 'blocked' : 'verdict');
  } else if (latest.event === 'started' || latest.event === 'loop') {
    sfx.play('started');
  }
}

function applySnapshot(snapshot) {
  const prevCount = app.lastEventCount;
  app.snapshot = snapshot;
  app.lastEventCount = snapshot?.state?.eventCount ?? 0;
  app.receivedAt = Date.now();
  if (prevCount > 0) playEventSound(prevCount, snapshot?.state);
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
  const items = [...app.works];
  if (current && !items.some((w) => w.workId === current)) {
    items.unshift({ workId: current, done: false, noEvents: true });
  }

  els.select.replaceChildren(
    ...items.map((work) => {
      const option = document.createElement('option');
      option.value = work.workId;
      option.textContent = work.noEvents
        ? `${work.workId} (no events)`
        : work.done
          ? `${work.workId} (done)`
          : `${work.workId} (active)`;
      return option;
    }),
  );
  if (current) els.select.value = current;
  els.select.disabled = items.length === 0;

  if (els.trigger && els.triggerLabel && els.menu) {
    els.trigger.disabled = items.length === 0;
    const activeItem = items.find((w) => w.workId === current) ?? items[0];
    els.triggerLabel.textContent = activeItem
      ? activeItem.noEvents
        ? `${activeItem.workId} (no events)`
        : activeItem.done
          ? `${activeItem.workId} (done)`
          : `${activeItem.workId} (active)`
      : 'No work items';

    els.menu.replaceChildren(
      ...items.map((work) => {
        const li = document.createElement('li');
        li.className = 'work-option';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(work.workId === current));

        const nameSpan = document.createElement('span');
        nameSpan.textContent = work.workId;

        const tagSpan = document.createElement('span');
        tagSpan.className = 'work-option-tag';
        tagSpan.dataset.done = String(Boolean(work.done));
        tagSpan.textContent = work.noEvents ? 'new' : work.done ? 'done' : 'active';

        li.append(nameSpan, tagSpan);
        li.addEventListener('click', () => {
          app.userSelected = true;
          closeDropdown();
          sfx.play('select');
          openWork(work.workId);
          renderWorkOptions();
        });
        return li;
      }),
    );
  }

  els.empty.hidden = app.works.length > 0 || Boolean(current);
}

async function refreshWorks() {
  try {
    const response = await fetch('/api/works', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const { works } = await response.json();
    app.works = Array.isArray(works) ? works : [];
    const decision = pickActiveWork(app.works, {
      currentWorkId: app.workId,
      userSelected: app.userSelected,
      lastTopKey: app.lastTopKey,
    });
    app.lastTopKey = decision.topKey;
    app.userSelected = decision.userSelected;
    if (decision.switched && decision.workId) {
      openWork(decision.workId);
    } else if (app.works.length === 0 && !app.workId) {
      setConnection('connecting', 'Waiting for work');
    }
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
