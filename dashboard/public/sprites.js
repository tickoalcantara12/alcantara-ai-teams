// Pixel-art office drawn from code so every character and state stays consistent and animatable.
// All coordinates are in logical pixels; the canvas is scaled up with nearest-neighbour rendering.

export const W = 384;
export const H = 216;
const WALL_H = 74;
export const DESK_TOP = 118;
const CHAR_TOP = DESK_TOP - 16;

export const ROLES = [
  { id: 'architect', name: 'Architect', title: 'Architecture Specialist' },
  { id: 'implementer', name: 'Implementer', title: 'Principal Software Engineer' },
  { id: 'reviewer', name: 'Reviewer', title: 'Principal Engineering Team Lead' },
  { id: 'security', name: 'Security', title: 'Security Pentester' },
  { id: 'qa', name: 'QA', title: 'QA Engineer' },
].map((role, i) => ({ ...role, x: 48 + i * 72 }));

const PALETTE = {
  architect: { hair: '#3b2a20', skin: '#e0ac7e', shirt: '#8a5a33', acc: '#23262f' },
  implementer: { hair: '#2b2118', skin: '#c68a5e', shirt: '#4b5563', acc: '#e05d5d' },
  reviewer: { hair: '#8a5a2b', skin: '#f1c9a5', shirt: '#dbe7f3', acc: '#8b2f3a' },
  security: { hair: '#1e2925', skin: '#9c6e54', shirt: '#1e2925', acc: '#38e07b' },
  qa: { hair: '#7a3b22', skin: '#f0c2a0', shirt: '#3f8f6b', acc: '#cfd8e3' },
};

const BODY = [
  '......HHHH......',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...HHSSSSSSHH...',
  '...HSSSSSSSSH...',
  '....SSESSESS....',
  '....SSSSSSSS....',
  '....SSSMMSSS....',
  '.....SSSSSS.....',
  '......SSSS......',
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '.CCCCCCCCCCCCCC.',
  '.CCCCCCCCCCCCCC.',
  '.CCCCCCCCCCCCCC.',
  '.CCCCCCCCCCCCCC.',
];

const GLYPHS = {
  question: ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  bang: ['##', '##', '##', '##', '##', '..', '##'],
  check: ['......#', '.....##', '#...##.', '##.##..', '.###...'],
  zzz: ['###....', '..#....', '.#..###', '###...#', '.....#.', '....###'],
  arrow: ['....#..', '.....#.', '#######', '.....#.', '....#..'],
};

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function grid(ctx, rows, ox, oy, colors) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = colors[row[x]];
      if (color) px(ctx, ox + x, oy + y, 1, 1, color);
    }
  });
}

function outline(ctx, x, y, w, h, color) {
  px(ctx, x, y, w, 1, color);
  px(ctx, x, y + h - 1, w, 1, color);
  px(ctx, x, y, 1, h, color);
  px(ctx, x + w - 1, y, 1, h, color);
}

export function drawRoom(ctx) {
  // Wall with subtle stripes and a baseboard.
  px(ctx, 0, 0, W, WALL_H, '#6aa39a');
  for (let x = 6; x < W; x += 12) px(ctx, x, 0, 1, WALL_H - 4, '#64998f');
  px(ctx, 0, 0, W, 3, '#557f78');
  px(ctx, 0, WALL_H - 5, W, 5, '#3e5f59');
  px(ctx, 0, WALL_H - 5, W, 1, '#4d746d');

  for (const wx of [24, 316]) drawWindow(ctx, wx, 14);
  drawWhiteboard(ctx, 144, 10);
  drawClock(ctx, 262, 22);

  // Wooden floor with staggered plank seams.
  px(ctx, 0, WALL_H, W, H - WALL_H, '#b9824f');
  for (let row = 0, y = WALL_H; y < H; row += 1, y += 9) {
    px(ctx, 0, y, W, 1, '#a87445');
    for (let x = (row * 23) % 48; x < W; x += 48) px(ctx, x, y, 1, 9, '#a06d40');
  }

  // Rug in front of the desks.
  px(ctx, 14, DESK_TOP + 30, W - 28, 42, '#3d4a6b');
  outline(ctx, 16, DESK_TOP + 32, W - 32, 38, '#5a6b96');
  for (let x = 20; x < W - 20; x += 8) px(ctx, x, DESK_TOP + 34, 4, 1, '#4a5a82');

  drawPlant(ctx, 4, WALL_H + 2);
  drawPlant(ctx, W - 20, WALL_H + 2);
  drawPlant(ctx, 6, H - 30);
  drawPlant(ctx, W - 22, H - 30);
}

function drawWindow(ctx, x, y) {
  px(ctx, x, y, 44, 32, '#2c3e50');
  px(ctx, x + 2, y + 2, 40, 28, '#9fd3f0');
  px(ctx, x + 2, y + 20, 40, 10, '#b9e2f6');
  px(ctx, x + 8, y + 7, 9, 3, '#f4fbff');
  px(ctx, x + 10, y + 5, 5, 2, '#f4fbff');
  px(ctx, x + 27, y + 12, 8, 2, '#f4fbff');
  px(ctx, x + 21, y + 2, 2, 28, '#2c3e50');
  px(ctx, x + 2, y + 15, 40, 2, '#2c3e50');
  px(ctx, x - 2, y + 32, 48, 3, '#d8d2c4');
}

function drawWhiteboard(ctx, x, y) {
  px(ctx, x, y, 96, 40, '#8a96a3');
  px(ctx, x + 2, y + 2, 92, 36, '#eef2f5');
  const colors = ['#4f7fd1', '#d98a3a', '#8f5bd6', '#2f9e6a', '#d14f6a'];
  colors.forEach((color, i) => {
    const bx = x + 7 + i * 18;
    px(ctx, bx, y + 14, 10, 8, color);
    if (i < colors.length - 1) {
      px(ctx, bx + 11, y + 18, 5, 1, '#5b6470');
      px(ctx, bx + 14, y + 17, 1, 3, '#5b6470');
    }
  });
  px(ctx, x + 8, y + 6, 30, 2, '#5b6470');
  px(ctx, x + 8, y + 28, 50, 1, '#a9b3be');
  px(ctx, x + 8, y + 31, 36, 1, '#a9b3be');
  px(ctx, x + 30, y + 40, 36, 2, '#6d7884');
}

function drawClock(ctx, x, y) {
  px(ctx, x + 2, y, 7, 11, '#f4f1ea');
  px(ctx, x, y + 2, 11, 7, '#f4f1ea');
  px(ctx, x + 1, y + 1, 9, 9, '#f4f1ea');
  outline(ctx, x + 1, y + 1, 9, 9, '#3e4652');
  px(ctx, x + 5, y + 3, 1, 3, '#3e4652');
  px(ctx, x + 5, y + 5, 3, 1, '#3e4652');
}

function drawPlant(ctx, x, y) {
  px(ctx, x + 4, y + 16, 9, 10, '#b5653a');
  px(ctx, x + 3, y + 15, 11, 2, '#9a522d');
  px(ctx, x + 7, y + 4, 3, 12, '#2f7a46');
  px(ctx, x + 2, y + 6, 6, 5, '#3f9a58');
  px(ctx, x + 9, y + 3, 6, 6, '#3f9a58');
  px(ctx, x + 4, y + 10, 4, 4, '#2f7a46');
  px(ctx, x + 10, y + 9, 5, 4, '#2f7a46');
  px(ctx, x + 6, y, 4, 5, '#4fb169');
}

/**
 * Returns true when an agent has no active work yet and should stroll around the office
 * instead of sitting at their desk.
 */
export function isRoaming(agent) {
  const status = agent?.status ?? 'idle';
  return status === 'idle' && !agent?.participated;
}

// Waypoint loops for each role using the back walkway (y ~ 86), side aisles (x ~ 16 / 368),
// and the front rug lounge (y ~ 152..172) so sprites never walk through desks.
const ROAM_PATHS = {
  architect: [
    { x: 168, y: 86, pause: 2600 }, // studying whiteboard left
    { x: 214, y: 86, pause: 2200 }, // studying whiteboard right
    { x: 336, y: 86, pause: 1800 }, // looking out right window
    { x: 366, y: 88, pause: 400 },
    { x: 366, y: 156, pause: 400 },
    { x: 280, y: 158, pause: 2000 }, // front rug right
    { x: 110, y: 158, pause: 2200 }, // front rug left
    { x: 18, y: 156, pause: 400 },
    { x: 18, y: 88, pause: 400 },
    { x: 46, y: 86, pause: 1800 },  // looking out left window
  ],
  implementer: [
    { x: 76, y: 162, pause: 2000 },
    { x: 192, y: 166, pause: 2500 },
    { x: 312, y: 160, pause: 2100 },
    { x: 242, y: 152, pause: 1800 },
    { x: 136, y: 154, pause: 2200 },
  ],
  reviewer: [
    { x: 260, y: 86, pause: 2400 }, // checking wall clock
    { x: 192, y: 86, pause: 2200 }, // checking whiteboard
    { x: 46, y: 86, pause: 1900 },  // left window
    { x: 18, y: 88, pause: 400 },
    { x: 18, y: 164, pause: 400 },
    { x: 160, y: 164, pause: 2300 },
    { x: 300, y: 164, pause: 2000 },
    { x: 366, y: 164, pause: 400 },
    { x: 366, y: 88, pause: 400 },
  ],
  security: [
    { x: 344, y: 168, pause: 2300 }, // inspecting right plant
    { x: 220, y: 160, pause: 1900 },
    { x: 40, y: 168, pause: 2400 },  // inspecting left plant
    { x: 150, y: 154, pause: 2000 },
    { x: 290, y: 156, pause: 1800 },
  ],
  qa: [
    { x: 120, y: 168, pause: 2100 },
    { x: 264, y: 168, pause: 2400 },
    { x: 340, y: 154, pause: 1700 },
    { x: 200, y: 152, pause: 2200 },
    { x: 52, y: 156, pause: 1900 },
  ],
};

const WALK_SPEED_PX_PER_MS = 0.028;

/**
 * Computes the deterministic (x, y, moving, dir) pose for a roaming agent at `timeMs`.
 */
export function getRoamerPose(roleId, timeMs = 0) {
  const pts = ROAM_PATHS[roleId] ?? ROAM_PATHS.implementer;
  const segments = pts.map((pt, i) => {
    const next = pts[(i + 1) % pts.length];
    const dist = Math.hypot(next.x - pt.x, next.y - pt.y);
    const moveMs = Math.max(1, Math.round(dist / WALK_SPEED_PX_PER_MS));
    const pauseMs = pt.pause ?? 1500;
    return { from: pt, to: next, pauseMs, moveMs, totalMs: pauseMs + moveMs };
  });
  const cycleMs = segments.reduce((acc, s) => acc + s.totalMs, 0);
  // Offset each role so their pauses and strides don't synchronize mechanically
  const roleOffset = ROLES.findIndex((r) => r.id === roleId) * 1730;
  let t = (Math.max(0, timeMs) + roleOffset) % cycleMs;

  for (const seg of segments) {
    if (t < seg.pauseMs) {
      return {
        x: Math.round(seg.from.x),
        y: Math.round(seg.from.y),
        moving: false,
        dir: seg.to.x >= seg.from.x ? 1 : -1,
      };
    }
    t -= seg.pauseMs;
    if (t < seg.moveMs) {
      const ratio = t / seg.moveMs;
      return {
        x: Math.round(seg.from.x + (seg.to.x - seg.from.x) * ratio),
        y: Math.round(seg.from.y + (seg.to.y - seg.from.y) * ratio),
        moving: true,
        dir: seg.to.x >= seg.from.x ? 1 : -1,
      };
    }
    t -= seg.moveMs;
  }
  return { x: pts[0].x, y: pts[0].y, moving: false, dir: 1 };
}

/**
 * Draws a roaming agent walking or standing on the office floor.
 */
export function drawRoamer(ctx, role, { time = 0, frame = 0, selected = false } = {}) {
  const pose = getRoamerPose(role.id, time);
  const cx = pose.x;
  const stride = Math.floor(time / 150) % 4;
  const bob = pose.moving && stride % 2 === 1 ? -1 : 0;
  const top = pose.y - 18 + bob;
  const p = PALETTE[role.id];
  const ox = cx - 8;

  // Floor shadow
  px(ctx, cx - 6, pose.y + 3, 12, 2, 'rgba(0,0,0,0.24)');

  // Legs / pants and shoes
  const leftLegOffset = pose.moving ? (stride === 1 ? -1 : stride === 3 ? 1 : 0) : 0;
  const rightLegOffset = pose.moving ? (stride === 3 ? -1 : stride === 1 ? 1 : 0) : 0;
  px(ctx, ox + 4, top + 16, 3, 4 + leftLegOffset, '#263147');
  px(ctx, ox + 9, top + 16, 3, 4 + rightLegOffset, '#263147');
  px(ctx, ox + 4, top + 19 + leftLegOffset, 3, 2, '#151922');
  px(ctx, ox + 9, top + 19 + rightLegOffset, 3, 2, '#151922');

  // Head & torso
  drawCharacter(ctx, role.id, cx, top, false, frame);

  // Swinging arms on sides
  const leftArmSwing = pose.moving ? (stride === 1 ? 1 : stride === 3 ? -1 : 0) : 0;
  const rightArmSwing = pose.moving ? (stride === 3 ? 1 : stride === 1 ? -1 : 0) : 0;
  px(ctx, ox + 1, top + 11 + leftArmSwing, 2, 4, p.shirt);
  px(ctx, ox + 1, top + 15 + leftArmSwing, 2, 2, p.skin);
  px(ctx, ox + 13, top + 11 + rightArmSwing, 2, 4, p.shirt);
  px(ctx, ox + 13, top + 15 + rightArmSwing, 2, 2, p.skin);

  if (selected) {
    outline(ctx, cx - 11, top - 4, 22, 27, '#ffd166');
  }
}

/**
 * Draws one role's workstation: chair, character (when seated), desk, props, hands and status overlay.
 * `agent` is the reducer state for the role (or undefined before data arrives).
 */
export function drawStation(ctx, role, agent, { frame, selected, handoffActive }) {
  const status = agent?.status ?? 'idle';
  const stale = Boolean(agent?.stale);
  const cx = role.x;
  const working = status === 'working' && !stale;
  const idle = status === 'idle';
  const roaming = isRoaming(agent);
  const slump = idle ? 1 : 0;

  // Chair back.
  px(ctx, cx - 10, CHAR_TOP + 5, 20, 13, '#252b38');
  px(ctx, cx - 9, CHAR_TOP + 6, 18, 11, '#2f3647');

  if (!roaming) {
    ctx.save();
    if (idle) ctx.globalAlpha = 0.75;
    drawCharacter(ctx, role.id, cx, CHAR_TOP + slump, status === 'waiting', frame);
    ctx.restore();
  }

  drawDesk(ctx, cx);
  drawProps(ctx, role.id, cx, working, frame);

  if (!roaming) {
    ctx.save();
    if (idle) ctx.globalAlpha = 0.75;
    drawHands(ctx, role.id, cx, CHAR_TOP + slump, status, working, frame);
    ctx.restore();
  }

  const box = { x: cx - 33, y: CHAR_TOP - 20, w: 66, h: DESK_TOP + 27 - (CHAR_TOP - 20) };
  if (status === 'blocked' && frame % 2 === 0) {
    outline(ctx, box.x, box.y, box.w, box.h, '#ff4d5e');
    outline(ctx, box.x + 1, box.y + 1, box.w - 2, box.h - 2, 'rgba(255,77,94,0.45)');
  }
  if (selected) {
    outline(ctx, box.x - 1, box.y - 1, box.w + 2, box.h + 2, '#ffd166');
  }

  if (!roaming) {
    drawOverlay(ctx, cx, CHAR_TOP - 15, { status, stale, handoffActive, frame });
  }
}

function drawCharacter(ctx, roleId, cx, top, raisedHand, frame) {
  const p = PALETTE[roleId];
  const ox = cx - 8;
  const skin = p.skin;

  if (roleId === 'security') px(ctx, ox + 2, top - 1, 12, 13, p.hair);
  if (roleId === 'qa') px(ctx, ox + 3, top + 2, 10, 11, p.hair);

  grid(ctx, BODY, ox, top, { H: p.hair, S: skin, E: '#1b1b22', M: '#b5585a', C: p.shirt });

  switch (roleId) {
    case 'architect':
      px(ctx, ox + 2, top - 1, 12, 3, p.acc);
      px(ctx, ox + 7, top - 2, 2, 1, p.acc);
      px(ctx, ox + 5, top + 8, 6, 2, '#5a3d2b');
      break;
    case 'implementer':
      px(ctx, ox + 3, top, 10, 1, p.acc);
      px(ctx, ox + 2, top + 3, 2, 4, p.acc);
      px(ctx, ox + 12, top + 3, 2, 4, p.acc);
      break;
    case 'reviewer':
      outline(ctx, ox + 5, top + 4, 3, 3, '#2b2f3a');
      outline(ctx, ox + 8, top + 4, 3, 3, '#2b2f3a');
      px(ctx, ox + 7, top + 10, 2, 6, p.acc);
      break;
    case 'security':
      px(ctx, ox + 4, top + 3, 8, 1, '#141b18');
      px(ctx, ox + 3, top + 10, 1, 4, '#2c3a34');
      px(ctx, ox + 12, top + 10, 1, 4, '#2c3a34');
      break;
    case 'qa':
      px(ctx, ox + 6, top + 11, 4, 1, '#e8f3ee');
      break;
  }

  if (raisedHand) {
    const bob = frame % 2;
    px(ctx, ox - 1, top + 3 + bob, 2, 9 - bob, p.shirt);
    px(ctx, ox - 2, top + bob, 3, 3, skin);
  }
}

function drawHands(ctx, roleId, cx, top, status, working, frame) {
  const p = PALETTE[roleId];
  const ox = cx - 8;
  const leftUp = working && frame % 2 === 0 ? -1 : 0;
  const rightUp = working && frame % 2 === 1 ? -1 : 0;
  if (status !== 'waiting') {
    px(ctx, ox + 1, top + 12, 2, 4, p.shirt);
    px(ctx, ox + 2, top + 16 + leftUp, 3, 2, p.skin);
  }
  px(ctx, ox + 13, top + 12, 2, 4, p.shirt);
  px(ctx, ox + 11, top + 16 + rightUp, 3, 2, p.skin);
}

function drawDesk(ctx, cx) {
  const d = DESK_TOP;
  px(ctx, cx - 27, d + 22, 54, 3, 'rgba(0,0,0,0.22)');
  px(ctx, cx - 29, d, 58, 9, '#c58b52');
  px(ctx, cx - 29, d, 58, 1, '#dca46a');
  px(ctx, cx - 29, d + 9, 58, 13, '#9a6334');
  px(ctx, cx - 29, d + 9, 58, 1, '#7d4f28');
  px(ctx, cx - 12, d + 14, 24, 1, '#7d4f28');
  px(ctx, cx - 2, d + 16, 4, 1, '#d9b38a');
}

function drawMonitor(ctx, x, y, screen) {
  px(ctx, x, y, 16, 11, '#151821');
  px(ctx, x + 1, y + 1, 14, 9, screen);
  px(ctx, x + 7, y + 11, 2, 3, '#2f3442');
  px(ctx, x + 4, y + 13, 8, 1, '#2f3442');
}

function drawProps(ctx, roleId, cx, working, frame) {
  const d = DESK_TOP;
  switch (roleId) {
    case 'architect':
      px(ctx, cx - 27, d + 2, 15, 6, '#2f6fb3');
      px(ctx, cx - 25, d + 3, 11, 1, '#cfe3ff');
      px(ctx, cx - 25, d + 5, 7, 1, '#cfe3ff');
      px(ctx, cx - 18, d + 4, 1, 3, '#cfe3ff');
      px(ctx, cx - 28, d + 1, 2, 8, '#24578f');
      px(ctx, cx + 19, d + 5, 7, 2, '#4a4f5a');
      px(ctx, cx + 22, d - 8, 1, 13, '#7a808c');
      px(ctx, cx + 18, d - 10, 7, 3, '#d9dde3');
      if (working) px(ctx, cx + 17, d - 7, 9, 2, 'rgba(255,226,140,0.55)');
      break;
    case 'implementer':
      px(ctx, cx - 7, d - 4, 14, 8, '#9aa3ae');
      px(ctx, cx - 7, d - 4, 14, 1, '#b7c0ca');
      px(ctx, cx - 1, d - 1, 2, 2, working ? '#ffffff' : '#e3e9ef');
      px(ctx, cx - 9, d + 4, 18, 2, '#7d8692');
      px(ctx, cx + 18, d + 1, 5, 6, '#f2f2f2');
      px(ctx, cx + 23, d + 2, 1, 3, '#f2f2f2');
      px(ctx, cx + 19, d + 1, 3, 1, '#6b4226');
      if (working) px(ctx, cx + 19 + (frame % 2), d - 3, 1, 3, 'rgba(255,255,255,0.55)');
      break;
    case 'reviewer':
      px(ctx, cx - 6, d, 12, 8, '#a87445');
      px(ctx, cx - 5, d + 1, 10, 7, '#f5f5f0');
      px(ctx, cx - 2, d, 4, 1, '#8a8f99');
      px(ctx, cx - 3, d + 3, 6, 1, '#9aa6b2');
      px(ctx, cx - 3, d + 5, 4, 1, '#9aa6b2');
      if (working) px(ctx, cx + 1 + (frame % 3), d + 5, 1, 1, '#d64545');
      px(ctx, cx - 25, d - 3, 5, 8, '#4f6d8f');
      px(ctx, cx - 24, d - 6, 1, 3, '#f2c94c');
      px(ctx, cx - 22, d - 5, 1, 2, '#e05d5d');
      px(ctx, cx + 16, d + 2, 10, 5, '#6b3fa0');
      px(ctx, cx + 16, d + 6, 10, 1, '#e8e0f5');
      break;
    case 'security': {
      drawMonitor(ctx, cx + 11, d - 13, working ? '#06180c' : '#0b100d');
      if (working) {
        for (let i = 0; i < 4; i += 1) px(ctx, cx + 13, d - 11 + i * 2, ((frame + i * 3) % 9) + 3, 1, '#38e07b');
      } else {
        px(ctx, cx + 13, d - 11, 2, 1, '#1d6b3c');
      }
      px(ctx, cx - 6, d + 3, 12, 3, '#2a2f3a');
      px(ctx, cx - 24, d + 2, 7, 5, '#e2b13c');
      px(ctx, cx - 23, d - 1, 5, 1, '#b98a1c');
      px(ctx, cx - 23, d - 1, 1, 3, '#b98a1c');
      px(ctx, cx - 19, d - 1, 1, 3, '#b98a1c');
      px(ctx, cx - 21, d + 4, 1, 2, '#7a5a12');
      break;
    }
    case 'qa': {
      drawMonitor(ctx, cx + 11, d - 13, '#dfe8f2');
      px(ctx, cx + 17, d - 9, 4, 4, '#d64545');
      px(ctx, cx + 16, d - 8, 1, 1, '#333');
      px(ctx, cx + 21, d - 8, 1, 1, '#333');
      px(ctx, cx + 16, d - 6, 1, 1, '#333');
      px(ctx, cx + 21, d - 6, 1, 1, '#333');
      if (working) px(ctx, cx + 12, d - 12 + (frame % 9), 14, 1, 'rgba(56,140,224,0.6)');
      px(ctx, cx - 6, d + 3, 12, 3, '#2a2f3a');
      outline(ctx, cx - 25, d, 6, 6, '#c9d3df');
      px(ctx, cx - 24, d + 1, 4, 4, 'rgba(200,230,255,0.45)');
      px(ctx, cx - 19, d + 6, 3, 2, '#6b4a2b');
      break;
    }
  }
}

function bubble(ctx, cx, y, fill, border) {
  px(ctx, cx - 7, y, 15, 11, fill);
  px(ctx, cx - 6, y - 1, 13, 1, border);
  px(ctx, cx - 6, y + 11, 13, 1, border);
  px(ctx, cx - 8, y, 1, 11, border);
  px(ctx, cx + 8, y, 1, 11, border);
  px(ctx, cx - 1, y + 11, 3, 2, fill);
  px(ctx, cx - 2, y + 11, 1, 2, border);
  px(ctx, cx + 2, y + 11, 1, 2, border);
  px(ctx, cx - 1, y + 13, 3, 1, border);
}

function drawOverlay(ctx, cx, y, { status, stale, handoffActive, frame }) {
  const bob = frame % 4 < 2 ? 0 : -1;
  if (status === 'waiting') {
    bubble(ctx, cx, y + bob, '#ffffff', '#1f2433');
    grid(ctx, GLYPHS.question, cx - 2, y + 2 + bob, { '#': '#3a6df0' });
  } else if (status === 'blocked') {
    if (frame % 2 === 0) grid(ctx, GLYPHS.bang, cx - 1, y + 2, { '#': '#ff4d5e' });
  } else if (status === 'done') {
    grid(ctx, GLYPHS.check, cx - 3, y + 4 + bob, { '#': '#3ddc84' });
  } else if (stale) {
    bubble(ctx, cx, y, '#d6dbe3', '#5b6372');
    grid(ctx, GLYPHS.zzz, cx - 3, y + 3, { '#': '#5b6372' });
  } else if (handoffActive) {
    bubble(ctx, cx, y + bob, '#e3f1ff', '#2b5a8a');
    grid(ctx, GLYPHS.arrow, cx - 3, y + 3 + bob, { '#': '#2b5a8a' });
  }
}

/**
 * Returns the role whose walking sprite or workstation contains the logical (x, y) coordinate.
 */
export function roleAt(x, y = DESK_TOP, agents = {}, time = 0) {
  if (typeof y === 'number') {
    for (const role of ROLES) {
      const agent = agents?.[role.id];
      if (isRoaming(agent)) {
        const pose = getRoamerPose(role.id, time);
        if (Math.abs(x - pose.x) <= 12 && y >= pose.y - 20 && y <= pose.y + 6) {
          return role;
        }
      }
    }
  }
  return ROLES.find((role) => Math.abs(x - role.x) <= 36) ?? null;
}

