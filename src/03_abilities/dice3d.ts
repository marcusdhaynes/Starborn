/**
 * dice3d — tiny dependency-free 3D dice engine for Starborn.
 *
 * Zero new dependencies, zero lazy chunks: pure math + a 2D canvas.
 * A real polyhedron (d4/d6/d8/d10/d12/d20/d100) is projected with true
 * perspective every animation frame, faces depth-sorted and shaded by a
 * fixed light, so the die visibly tumbles like a physical object instead of
 * a flat spinning square. The landed face is computed from the same
 * rotation the renderer uses, so the face you see is the value recorded.
 *
 * Rotation convention (matches the old cube code): a rotation is Euler
 * angles (rx, ry, rz) in degrees, applied Z first, then Y, then X, i.e.
 *   R = Rx(rx) * Ry(ry) * Rz(rz)
 * All helpers in this file use that exact order, so landing math and
 * rendering can never disagree about which face is front.
 */

export type Vec3 = [number, number, number];

export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface DieFace {
  /** Value shown on this face. For d100 this is a tens label ('00'..'90'). */
  label: number | string;
  /** Face vertices in model space, in cyclic order. */
  verts: Vec3[];
  /** Outward unit normal, model space. */
  normal: Vec3;
  /** Face centroid, model space. */
  centroid: Vec3;
}

export interface DieGeometry {
  sides: DieSides;
  faces: DieFace[];
}

export interface DieTheme {
  /** Gradient stops, dark -> mid -> light (hex). */
  stops: [string, string, string];
  /** Edge stroke colour (hex). */
  stroke: string;
  /** Number colour (hex). */
  number: string;
  /** Number drop-shadow colour (hex). */
  shadow: string;
}

const DEG = Math.PI / 180;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: readonly number[]): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Rotate a vector by Euler angles (deg), Z first, then Y, then X. */
export function rotateVec(v: Vec3, rx: number, ry: number, rz: number): Vec3 {
  const [x, y, z] = v;
  const ax = rx * DEG;
  const ay = ry * DEG;
  const az = rz * DEG;
  // Rz
  const cx = Math.cos(az);
  const sx = Math.sin(az);
  const x1 = x * cx - y * sx;
  const y1 = x * sx + y * cx;
  const z1 = z;
  // Ry
  const cy = Math.cos(ay);
  const sy = Math.sin(ay);
  const x2 = x1 * cy + z1 * sy;
  const y2 = y1;
  const z2 = -x1 * sy + z1 * cy;
  // Rx
  const cz = Math.cos(ax);
  const sz = Math.sin(ax);
  const x3 = x2;
  const y3 = y2 * cz - z2 * sz;
  const z3 = y2 * sz + z2 * cz;
  return [x3, y3, z3];
}

function makeFace(label: number | string, verts: Vec3[]): DieFace {
  const centroid = scale(
    verts.reduce((acc, v) => add(acc, v), [0, 0, 0] as Vec3),
    1 / verts.length,
  );
  // Newell-style normal from the first triangle; flip if it points inward.
  let normal = norm(cross(sub(verts[1], verts[0]), sub(verts[2], verts[0])));
  if (dot(normal, centroid) < 0) normal = scale(normal, -1);
  return { label, verts, normal, centroid };
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

const PHI = (1 + Math.sqrt(5)) / 2;

function buildD4(): DieFace[] {
  const v: Vec3[] = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ].map((p) => norm(p));
  // Face opposite vertex i carries value i+1; landing brings that face
  // front, so the front face always shows the rolled value.
  return [
    makeFace(1, [v[1], v[2], v[3]]),
    makeFace(2, [v[0], v[2], v[3]]),
    makeFace(3, [v[0], v[1], v[3]]),
    makeFace(4, [v[0], v[1], v[2]]),
  ];
}

function buildD6(): DieFace[] {
  const s = 1 / Math.sqrt(3);
  // Cube corners (circumradius 1). Opposite faces sum to 7, as on a
  // standard die; face 1 is +Z (front at rest), matching the old cube.
  const c = (x: number, y: number, z: number): Vec3 => [x * s, y * s, z * s];
  const corners = [
    c(1, 1, 1),
    c(1, 1, -1),
    c(1, -1, 1),
    c(1, -1, -1),
    c(-1, 1, 1),
    c(-1, 1, -1),
    c(-1, -1, 1),
    c(-1, -1, -1),
  ];
  const [a, b, d, e, f, g, h, i] = corners;
  return [
    makeFace(1, [a, f, h, d]), // +Z front
    makeFace(6, [b, e, i, g]), // -Z back
    makeFace(2, [a, b, e, d]), // +X
    makeFace(5, [f, g, i, h]), // -X
    makeFace(3, [a, f, g, b]), // +Y
    makeFace(4, [d, e, i, h]), // -Y
  ];
}

function buildD8(): DieFace[] {
  const X: Vec3 = [1, 0, 0];
  const x: Vec3 = [-1, 0, 0];
  const Y: Vec3 = [0, 1, 0];
  const y: Vec3 = [0, -1, 0];
  const Z: Vec3 = [0, 0, 1];
  const z: Vec3 = [0, 0, -1];
  // Opposite faces sum to 9.
  return [
    makeFace(1, [X, Y, Z]),
    makeFace(8, [x, y, z]),
    makeFace(2, [X, Y, z]),
    makeFace(7, [x, y, Z]),
    makeFace(3, [X, y, Z]),
    makeFace(6, [x, Y, z]),
    makeFace(4, [X, y, z]),
    makeFace(5, [x, Y, Z]),
  ];
}

/** Pentagonal trapezohedron (d10). Poles + two staggered rings of 5.
 *  Labels are assigned by antipodal pairing (opposite faces sum to 11),
 *  exactly like the d20 builder below. */
function buildTrapezohedron(tensLabels: boolean): DieFace[] {
  const N: Vec3 = [0, 1, 0];
  const S: Vec3 = [0, -1, 0];
  const ringY = 0.42;
  const ringR = 0.86;
  const U: Vec3[] = Array.from({ length: 5 }, (_, k) => {
    const a = ((72 * k) * DEG);
    return [Math.cos(a) * ringR, ringY, Math.sin(a) * ringR] as Vec3;
  });
  const L: Vec3[] = Array.from({ length: 5 }, (_, k) => {
    const a = ((36 + 72 * k) * DEG);
    return [Math.cos(a) * ringR, -ringY, Math.sin(a) * ringR] as Vec3;
  });
  const faces: DieFace[] = [];
  for (let k = 0; k < 5; k++) {
    const k1 = (k + 1) % 5;
    faces.push(makeFace(0, [N, U[k], L[k], U[k1]]));
    faces.push(makeFace(0, [S, L[k], U[k1], L[k1]]));
  }
  if (tensLabels) {
    // Percentile die: faces read 00/10/20/.../90. The exact 1-100 value
    // is drawn on the landed face by the renderer (see drawDie).
    const tens = ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90'];
    faces.forEach((f, i) => {
      f.label = tens[i % tens.length];
    });
    return faces;
  }
  pairOppositeLabels(faces, 11);
  return faces;
}

/** Assign labels to antipodal face pairs so each pair sums to `total`. */
function pairOppositeLabels(faces: DieFace[], total: number): void {
  const used = new Array(faces.length).fill(false);
  let next = 1;
  for (let i = 0; i < faces.length; i++) {
    if (used[i]) continue;
    let twin = -1;
    for (let j = 0; j < faces.length; j++) {
      if (j !== i && !used[j] && dot(faces[i].normal, faces[j].normal) < -0.999) {
        twin = j;
        break;
      }
    }
    faces[i].label = next;
    used[i] = true;
    if (twin >= 0) {
      faces[twin].label = total - next;
      used[twin] = true;
    }
    next++;
  }
}

function buildD12(): DieFace[] {
  // Dodecahedron vertices.
  const v: Vec3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) v.push([sx, sy, sz]);
  for (const sy of [-1, 1])
    for (const sz of [-1, 1]) v.push([0, sy / PHI, sz * PHI]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) v.push([sx / PHI, sz * PHI, 0]);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) v.push([sx * PHI, 0, sy / PHI]);
  const verts = v.map((p) => norm(p));
  // Face normals are the icosahedron vertices in the (0,±φ,±1) pattern
  // (the pattern matching this vertex set — verified: the 5 vertices
  // with the largest dot product with each normal are coplanar).
  // Take 6 base normals and their negations in reverse order, so index
  // i and 11-i are antipodal and can carry values summing to 13.
  const base: Vec3[] = [
    [0, PHI, 1],
    [0, PHI, -1],
    [PHI, 1, 0],
    [PHI, -1, 0],
    [1, 0, PHI],
    [1, 0, -PHI],
  ].map((p) => norm(p));
  const normals: Vec3[] = [...base, ...[...base].reverse().map((p) => scale(p, -1))];
  return normals.map((n, i) => {
    // The 5 vertices with the largest dot product with n form the face.
    const ranked = verts
      .map((p) => ({ p, d: dot(p, n) }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 5)
      .map((r) => r.p);
    const centroid = scale(
      ranked.reduce((acc, p) => add(acc, p), [0, 0, 0] as Vec3),
      1 / ranked.length,
    );
    // Order vertices angularly around the normal so the polygon is cyclic.
    const u = norm(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
    const w = cross(n, u);
    const ordered = [...ranked].sort((a, b) => {
      const da = sub(a, centroid);
      const db = sub(b, centroid);
      return Math.atan2(dot(da, w), dot(da, u)) - Math.atan2(dot(db, w), dot(db, u));
    });
    return makeFace(i + 1, ordered);
  });
}

function buildD20(): DieFace[] {
  const raw: Vec3[] = [
    [0, 1, PHI],
    [0, 1, -PHI],
    [0, -1, PHI],
    [0, -1, -PHI],
    [1, PHI, 0],
    [1, -PHI, 0],
    [-1, PHI, 0],
    [-1, -PHI, 0],
    [PHI, 0, 1],
    [PHI, 0, -1],
    [-PHI, 0, 1],
    [-PHI, 0, -1],
  ].map((p) => norm(p));
  // Edge length = shortest distance between any two vertices.
  let edge = Infinity;
  for (let i = 0; i < raw.length; i++)
    for (let j = i + 1; j < raw.length; j++)
      edge = Math.min(edge, len(sub(raw[i], raw[j])));
  const triples: [number, number, number][] = [];
  for (let i = 0; i < raw.length; i++)
    for (let j = i + 1; j < raw.length; j++)
      for (let k = j + 1; k < raw.length; k++) {
        const dij = len(sub(raw[i], raw[j]));
        const dik = len(sub(raw[i], raw[k]));
        const djk = len(sub(raw[j], raw[k]));
        if (Math.abs(dij - edge) < 1e-6 && Math.abs(dik - edge) < 1e-6 && Math.abs(djk - edge) < 1e-6) {
          triples.push([i, j, k]);
        }
      }
  // Pair each face with its antipodal twin (normal ~ -n) and give the
  // pair values summing to 21.
  const faces = triples.map(([i, j, k]) => makeFace(0, [raw[i], raw[j], raw[k]]));
  pairOppositeLabels(faces, 21);
  return faces;
}

const GEOMETRY_CACHE = new Map<DieSides, DieGeometry>();

export function getGeometry(sides: DieSides): DieGeometry {
  const cached = GEOMETRY_CACHE.get(sides);
  if (cached) return cached;
  let faces: DieFace[];
  switch (sides) {
    case 4:
      faces = buildD4();
      break;
    case 6:
      faces = buildD6();
      break;
    case 8:
      faces = buildD8();
      break;
    case 10:
      faces = buildTrapezohedron(false);
      break;
    case 12:
      faces = buildD12();
      break;
    case 20:
      faces = buildD20();
      break;
    case 100:
      faces = buildTrapezohedron(true);
      break;
    default:
      faces = buildD6();
      break;
  }
  const geo: DieGeometry = { sides, faces };
  GEOMETRY_CACHE.set(sides, geo);
  return geo;
}

/** Face whose label equals `value`. For d100 this is the tens face used
 *  only to pick a landing orientation; the exact 1-100 value is drawn on
 *  the landed face by the renderer. */
export function faceForValue(sides: DieSides, value: number): DieFace {
  const geo = getGeometry(sides);
  if (sides === 100) {
    const idx = ((value - 1) % 10 + 10) % 10;
    // Trapezohedron faces alternate north/south; find the face whose
    // tens label corresponds to this slot deterministically.
    return geo.faces[idx % geo.faces.length];
  }
  const found = geo.faces.find((f) => f.label === value);
  return found ?? geo.faces[0];
}

/* ------------------------------------------------------------------ */
/* Orientation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Euler angles (deg) that bring `value`'s face to the front (+Z, toward
 * the viewer) with its number upright, chosen congruent (mod 360°) to the
 * die's current angles so it never spins backwards to land.
 */
export function orientationForFace(
  sides: DieSides,
  value: number,
  current: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const face = faceForValue(sides, value);
  const n = face.normal;
  // "Up" of the face: direction from its centroid to its topmost vertex.
  let top = face.verts[0];
  for (const v of face.verts) if (v[1] > top[1]) top = v;
  const upVec = norm(sub(top, face.centroid));

  let best: { x: number; y: number; z: number; score: number } | null = null;
  // Try in-plane twists; for each, the Y/X angles that put the normal
  // on +Z follow in closed form. Keep the twist whose face-up points
  // most nearly straight up on screen.
  for (let rz = 0; rz < 360; rz += 15) {
    const n1 = rotateVec(n, 0, 0, rz);
    const ry = -Math.atan2(n1[0], n1[2]) / DEG;
    const rx = Math.atan2(n1[1], Math.hypot(n1[0], n1[2])) / DEG;
    const up = rotateVec(upVec, rx, ry, rz);
    const score = up[1]; // +Y on screen is up; maximise.
    if (!best || score > best.score) best = { x: rx, y: ry, z: rz, score };
  }
  const b = best ?? { x: 0, y: 0, z: 0 };
  // A tetrahedron viewed face-on is a flat triangle, so tip a d4 back a
  // little: two neighbouring faces peek out and it reads as a solid.
  // The target face stays well clear of the others (tetrahedron face
  // normals are ~109 degrees apart), so it is still unambiguously the
  // face showing.
  if (sides === 4) b.x -= 20;
  const snap = (cur: number, base: number) =>
    Math.round((cur - base) / 360) * 360 + base;
  return { x: snap(current.x, b.x), y: snap(current.y, b.y), z: snap(current.z, b.z) };
}

/** Value of the face most nearly facing the viewer at these angles. */
export function mostVisibleFace(sides: DieSides, rx: number, ry: number, rz: number): number {
  const geo = getGeometry(sides);
  let best: DieFace | null = null;
  let bestZ = -Infinity;
  for (const face of geo.faces) {
    const z = rotateVec(face.normal, rx, ry, rz)[2];
    if (z > bestZ) {
      bestZ = z;
      best = face;
    }
  }
  if (!best) return 1;
  if (typeof best.label === 'string') {
    const n = parseInt(best.label, 10);
    return Number.isFinite(n) ? n : 1;
  }
  return best.label;
}

/** Nearest angles congruent to the upright home orientation (0,0,0). */
export function nearestHomeAngles(current: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: Math.round(current.x / 360) * 360,
    y: Math.round(current.y / 360) * 360,
    z: Math.round(current.z / 360) * 360,
  };
}

/* ------------------------------------------------------------------ */
/* Themes (same palette as the old SVG die faces)                      */
/* ------------------------------------------------------------------ */

export const DIE_THEMES: Record<string, DieTheme> = {
  amber: {
    stops: ['#ef4444', '#f59e0b', '#450a0a'],
    stroke: '#fbbf24',
    number: '#fef08a',
    shadow: '#450a0a',
  },
  celestial: {
    stops: ['#8b5cf6', '#4f46e5', '#0f172a'],
    stroke: '#22d3ee',
    number: '#ecfeff',
    shadow: '#1e1b4b',
  },
  abyssal: {
    stops: ['#1e3a8a', '#0284c7', '#0f172a'],
    stroke: '#38bdf8',
    number: '#e0f2fe',
    shadow: '#0f172a',
  },
  ruby: {
    stops: ['#f43f5e', '#9f1239', '#4c0519'],
    stroke: '#fb7185',
    number: '#ffe4e6',
    shadow: '#4c0519',
  },
  emerald: {
    stops: ['#34d399', '#059669', '#064e3b'],
    stroke: '#34d399',
    number: '#d1fae5',
    shadow: '#064e3b',
  },
};

export function getDieTheme(key: string): DieTheme {
  return DIE_THEMES[key] ?? DIE_THEMES.amber;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Canvas renderer                                                     */
/* ------------------------------------------------------------------ */

const LIGHT: Vec3 = norm([-0.45, 0.75, 0.55]);

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c * f)));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export interface DrawDieOptions {
  sides: DieSides;
  /** Number to show on the front face (the rolled / current value). */
  value: number;
  theme: DieTheme;
  rotX: number;
  rotY: number;
  rotZ: number;
  /** Selected in the results list: draw the old red selected edge. */
  selected?: boolean;
}

/**
 * Draw one die into a square canvas (backing store, e.g. 160x160 for a
 * 40px CSS box). Pure 2D canvas: project with perspective, painter-sort
 * faces far-to-near, shade each face by its angle to a fixed light.
 * The most-visible face gets the exact `value` drawn on it, so what you
 * see is always the recorded roll — including d100 (1-100) and d20.
 */
export function drawDie(
  canvas: HTMLCanvasElement,
  opts: DrawDieOptions,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.35; // model circumradius in px
  const FOCAL = 5; // perspective: camera 5 units out, die radius 1

  ctx.clearRect(0, 0, W, H);

  const geo = getGeometry(opts.sides);
  const project = (p: Vec3): { x: number; y: number; z: number; s: number } => {
    const r = rotateVec(p, opts.rotX, opts.rotY, opts.rotZ);
    const s = FOCAL / (FOCAL - r[2]);
    return { x: cx + r[0] * R * s, y: cy - r[1] * R * s, z: r[2], s };
  };

  // Depth-sort faces far -> near by average projected z.
  const drawn = geo.faces
    .map((face) => {
      const pts = face.verts.map(project);
      const avgZ = pts.reduce((a, p) => a + p.z, 0) / pts.length;
      const nRot = rotateVec(face.normal, opts.rotX, opts.rotY, opts.rotZ);
      return { face, pts, avgZ, nRot };
    })
    .sort((a, b) => a.avgZ - b.avgZ);

  const front = drawn[drawn.length - 1];

  for (const { face, pts, nRot } of drawn) {
    const isFront = face === front?.face;
    // Shade: 0.55 (facing away from light) .. 1.15 (facing the light).
    const light = Math.max(0, dot(nRot, LIGHT));
    const bright = 0.55 + 0.6 * light;
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
    grad.addColorStop(0, shade(opts.theme.stops[0], bright));
    grad.addColorStop(0.55, shade(opts.theme.stops[1], bright));
    grad.addColorStop(1, shade(opts.theme.stops[2], bright));

    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = grad;
    if (isFront && opts.selected) {
      ctx.shadowColor = 'rgba(239,68,68,0.75)';
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.lineJoin = 'round';
    ctx.lineWidth = isFront ? (opts.selected ? 4 : 3) : 2;
    ctx.strokeStyle =
      isFront && opts.selected
        ? '#ef4444'
        : isFront
          ? opts.theme.stroke
          : shade(opts.theme.stroke, 0.75);
    ctx.stroke();

    // Number, centred on the face, rotated to the face's "up".
    const centroid = face.centroid;
    const cProj = project(centroid);
    let top = face.verts[0];
    for (const v of face.verts) if (v[1] > top[1]) top = v;
    const upModel = norm(sub(top, centroid));
    const upRot = rotateVec(upModel, opts.rotX, opts.rotY, opts.rotZ);
    const upScreen: [number, number] = [upRot[0], -upRot[1]];
    const upLen = Math.hypot(upScreen[0], upScreen[1]) || 1;
    const ux = upScreen[0] / upLen;
    const uy = upScreen[1] / upLen;
    const theta = Math.atan2(ux, -uy);

    const label = isFront
      ? String(opts.value)
      : typeof face.label === 'string'
        ? face.label
        : String(face.label);
    // Face size on screen, for fitting the number.
    const faceR = Math.max(
      ...pts.map((p) => Math.hypot(p.x - cProj.x, p.y - cProj.y)),
      1,
    );
    let fontPx = Math.min(faceR * 1.0, R * 0.62);
    if (label.length === 2) fontPx *= 0.68;
    else if (label.length >= 3) fontPx *= 0.52;
    if (opts.sides === 4) fontPx *= 0.8;

    ctx.save();
    ctx.translate(cProj.x, cProj.y);
    ctx.rotate(theta);
    ctx.font = `900 ${fontPx.toFixed(1)}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = opts.theme.shadow;
    ctx.shadowBlur = fontPx * 0.16;
    ctx.shadowOffsetY = fontPx * 0.05;
    ctx.fillStyle = isFront ? opts.theme.number : shade(opts.theme.number, 0.82);
    ctx.fillText(label, 0, fontPx * 0.04);
    ctx.restore();

    // Faint star sparkle on the front face, keeping the starry theme.
    if (isFront) {
      const star = (sx: number, sy: number, r: number, alpha: number) => {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();
        ctx.restore();
      };
      const span = Math.max(6, faceR * 0.42);
      star(cProj.x - span, cProj.y - span * 0.7, 3.2, 0.75);
      star(cProj.x + span * 0.8, cProj.y + span * 0.55, 2.4, 0.55);
    }
  }
}
