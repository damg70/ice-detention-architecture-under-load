// Person view, 3D: tiered rings around one mannequin, lit by the day cycle.
// A hybrid of model and data visualization, not a depiction of a cell.
// Everything is deterministic: textures use a seeded generator, and there is
// no randomness in lighting.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();
import { rgbFor } from '../ui/colorScale.js';
import { stateFor } from '../model/explain.js';
import { windowKind } from '../model/dayCycle.js';

// ── Deterministic procedural materials ───────────────────────────────────
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(seed, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  draw(g, mulberry32(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function speckle(g, rnd, n, lo, hi, size = 2) {
  for (let i = 0; i < n; i++) {
    const v = Math.round(lo + rnd() * (hi - lo));
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * 256, rnd() * 256, size, size);
  }
}

// Four materials keyed to state: soft (supportive/resilient), worn (mixed),
// hard (substantial strain), degraded (severe).
function makeTextures() {
  return {
    soft: canvasTexture(11, (g, rnd) => {
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 1;
      for (let i = 0; i < 256; i += 4) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
        g.beginPath(); g.moveTo(0, i + 2); g.lineTo(256, i + 2); g.stroke();
      }
      speckle(g, rnd, 600, 225, 250, 1);
    }),
    worn: canvasTexture(23, (g, rnd) => {
      g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) {
        const v = Math.round(185 + rnd() * 50);
        g.fillStyle = `rgba(${v},${v},${v},0.5)`;
        g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 8 + rnd() * 30, 5 + rnd() * 18, rnd() * 3, 0, Math.PI * 2); g.fill();
      }
      speckle(g, rnd, 1500, 170, 240, 2);
    }),
    hard: canvasTexture(37, (g, rnd) => {
      g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, 256, 256);
      speckle(g, rnd, 5000, 140, 225, 2);
      g.strokeStyle = 'rgba(40,40,40,0.35)'; g.lineWidth = 2;
      for (const x of [0, 128]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
      for (const y of [0, 128]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    }),
    degraded: canvasTexture(53, (g, rnd) => {
      g.fillStyle = '#b9b9b9'; g.fillRect(0, 0, 256, 256);
      speckle(g, rnd, 6000, 90, 210, 2);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = `rgba(30,25,20,${0.12 + rnd() * 0.2})`;
        g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 10 + rnd() * 40, 6 + rnd() * 25, rnd() * 3, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(20,20,20,0.7)'; g.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        let x = rnd() * 256, y = rnd() * 256;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y); }
        g.stroke();
      }
    }),
  };
}

// Textures are off for now: rings render as flat color. Flip to restore.
const USE_TEXTURES = false;

const MATERIAL_FOR_STATE = { resilient: 'soft', supportive: 'soft', mixed: 'worn', substantial: 'hard', severe: 'degraded' };
const ROUGHNESS = { soft: 0.95, worn: 0.85, hard: 0.6, degraded: 0.92 };

// ── Light colour (from the fluorescent lab: Kelvin + the tubes' green spike) ─
function kelvinToColor(k, greenTint) {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  const col = new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
  col.g *= 1 + greenTint * 0.25; col.r *= 1 - greenTint * 0.08;
  return col;
}
const FLUORESCENT = kelvinToColor(4100, 0.4);
const SUNLIGHT = kelvinToColor(5200, 0);
const WINDOW_SUN = kelvinToColor(3400, 0);
const INDOOR_BG = new THREE.Color(0x0c0c0d);
const NIGHT_AMBIENT = new THREE.Color(0x7d8aa6);   // cool, dim residual light after lights out
const SKY_BG = new THREE.Color(0xa7c4dc);

// ── View ─────────────────────────────────────────────────────────────────
export function createPersonView(host, { palette = 'standard', lighting, cellRadius } = {}) {
  const windows = lighting.windows;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = INDOOR_BG.clone();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(3.4, 1.9, 3.9);   // frames the whole half-cell (height sets the distance)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.75, 0);
  controls.enableDamping = true;
  controls.enabled = false;             // fixed view (2026-10-05): the user owns the clock, not the camera
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.49;

  const tex = makeTextures();

  const ringsGroup = new THREE.Group();
  scene.add(ringsGroup);

  // Mannequin: blank face, simplified limbs (after the Waldorf doll).
  const skin = new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.75 });
  const mannequin = new THREE.Group();
  const part = (geo, x, y, z = 0) => { const m = new THREE.Mesh(geo, skin); m.position.set(x, y, z); m.castShadow = true; mannequin.add(m); return m; };
  part(new THREE.CapsuleGeometry(0.07, 0.36, 6, 16), -0.075, 0.25);
  part(new THREE.CapsuleGeometry(0.07, 0.36, 6, 16), 0.075, 0.25);
  part(new THREE.CapsuleGeometry(0.15, 0.3, 8, 20), 0, 0.72);
  part(new THREE.CapsuleGeometry(0.05, 0.36, 6, 12), -0.22, 0.72).rotation.z = 0.12;
  part(new THREE.CapsuleGeometry(0.05, 0.36, 6, 12), 0.22, 0.72).rotation.z = -0.12;
  part(new THREE.SphereGeometry(0.12, 24, 16), 0, 1.11);
  const MANNEQUIN_HEIGHT = 1.11 + 0.12;   // top of the head above its feet
  scene.add(mannequin);

  // ── The half-cell ──────────────────────────────────────────────────────
  // A symbolic half cell: a half-cylinder wall as wide as the outermost ring
  // and a full-circle ceiling carrying the fluorescent tubes. The window in
  // the wall behind the mannequin is architecture: its presence and size
  // come from the daylight baseline (none, a high slit, a barred window, a
  // larger one), and an unmarked edge draws only a dashed outline.
  const CELL = {
    radius: cellRadius,    // just outside the world ring (from person-config radii)
    ceiling: 2.8 * 2 / 3,  // default height above the nominal floor (y = 0); lowered by a third 2026-10-04
    headroom: 0.2,         // clearance kept above the mannequin's head
    color: 0xdedcd6,       // near-white institutional paint
    barRadius: 0.02,
    thickness: 0.06,       // wall thickness (2026-10-05)
    // Back of the cell: opposite the opening camera direction, so the window
    // sits behind the mannequin as first seen.
    backAngle: Math.atan2(-3.4, -3.9),
  };
  const cellMat = new THREE.MeshStandardMaterial({ color: CELL.color, roughness: 0.92, side: THREE.DoubleSide });
  const barMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.5, metalness: 0.6 });
  const outlineMat = new THREE.LineDashedMaterial({ color: 0x8a8a86, dashSize: 0.04, gapSize: 0.03 });
  const cell = new THREE.Group();
  scene.add(cell);

  // Ceiling: a solid half-lid over the back half only, as thick as the wall,
  // cut along the same section line as the wall (an architectural section
  // model). From the raised camera it reads as the top of a cut-open cell;
  // the open front lets you look in. Shape angles map to wall angles t as
  // theta = t - π/2 once the shape is laid flat.
  const lidShape = new THREE.Shape();
  lidShape.moveTo(0, 0);
  lidShape.absarc(0, 0, CELL.radius + CELL.thickness, CELL.backAngle - Math.PI, CELL.backAngle, false);
  lidShape.lineTo(0, 0);
  const ceiling = new THREE.Mesh(
    new THREE.ExtrudeGeometry(lidShape, { depth: CELL.thickness, bevelEnabled: false, curveSegments: 48 }),
    cellMat);
  ceiling.rotation.x = -Math.PI / 2;    // extrusion runs upward
  ceiling.castShadow = true;
  let ceilingY = CELL.ceiling;            // rises only if a high mound would push the head through
  ceiling.receiveShadow = true;
  cell.add(ceiling);

  const wallGroup = new THREE.Group();
  cell.add(wallGroup);
  const wallDisposables = [];
  let opening = null;                   // current window spec, or null (none / outline)
  const winCentre = new THREE.Vector3();

  // Sky glow just outside the window, so the opening itself shows the time
  // of day. Brightness also follows how much daylight the window admits.
  const SKY_NIGHT = new THREE.Color(0x070a12), SKY_DAY = new THREE.Color(0xb9d3ea), SKY_DIM = new THREE.Color(0x2b2e33);
  const glowMat = new THREE.MeshBasicMaterial({ color: SKY_NIGHT.clone() });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
  cell.add(glow);

  // CylinderGeometry measures theta from +z toward +x.
  const onWall = (t, y, r = CELL.radius) => new THREE.Vector3(Math.sin(t) * r, y, Math.cos(t) * r);
  // A wall piece is a thick curved slab: inner face at the radius, outer
  // face at radius + thickness. Edges are closed separately (caps below).
  function wallPiece(theta0, theta1, y0, y1) {
    const segs = Math.max(4, Math.round(48 * (theta1 - theta0) / Math.PI));
    for (const r of [CELL.radius, CELL.radius + CELL.thickness]) {
      const geo = new THREE.CylinderGeometry(r, r, y1 - y0, segs, 1, true, theta0, theta1 - theta0);
      const m = new THREE.Mesh(geo, cellMat);
      m.position.y = (y0 + y1) / 2;
      m.castShadow = m.receiveShadow = true;
      wallGroup.add(m); wallDisposables.push(geo);
    }
  }
  // Vertical cap across the thickness at angle t (wall ends, window jambs).
  function radialFace(t, y0, y1) {
    const geo = new THREE.PlaneGeometry(CELL.thickness, y1 - y0);
    const m = new THREE.Mesh(geo, cellMat);
    m.position.copy(onWall(t, (y0 + y1) / 2, CELL.radius + CELL.thickness / 2));
    m.rotation.y = t - Math.PI / 2;
    m.castShadow = m.receiveShadow = true;
    wallGroup.add(m); wallDisposables.push(geo);
  }
  // Horizontal cap across the thickness from t0 to t1 (top edge, sill, head).
  function ringFace(t0, t1, y) {
    const geo = new THREE.RingGeometry(CELL.radius, CELL.radius + CELL.thickness, Math.max(4, Math.round(48 * (t1 - t0) / Math.PI)), 1, t0 - Math.PI / 2, t1 - t0);
    const m = new THREE.Mesh(geo, cellMat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.receiveShadow = true;
    wallGroup.add(m); wallDisposables.push(geo);
  }
  function buildWall(bottom, kind) {
    for (const d of wallDisposables.splice(0)) d.dispose();
    wallGroup.clear();
    const b = CELL.backAngle;
    opening = kind === 'none' || kind === 'outline' ? null : windows[kind];
    const spec = opening ?? (kind === 'outline' ? windows.window : null);

    radialFace(b - Math.PI / 2, bottom, ceilingY);
    radialFace(b + Math.PI / 2, bottom, ceilingY);

    if (!opening) {
      wallPiece(b - Math.PI / 2, b + Math.PI / 2, bottom, ceilingY);
      glow.visible = false;
      if (spec) {   // unmarked: where a window would be, as a dashed outline
        const y = spec.y * ceilingY, h = spec.height / 2, half = spec.width / 2 / CELL.radius, r = CELL.radius * 0.993;
        const pts = [];
        for (let i = 0; i <= 16; i++) pts.push(onWall(b - half + (2 * half * i) / 16, y - h, r));
        for (let i = 16; i >= 0; i--) pts.push(onWall(b - half + (2 * half * i) / 16, y + h, r));
        pts.push(pts[0].clone());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, outlineMat);
        line.computeLineDistances();
        wallGroup.add(line); wallDisposables.push(geo);
      }
      return;
    }

    const winY = opening.y * ceilingY;
    const half = opening.width / 2 / CELL.radius, w0 = b - half, w1 = b + half;
    const y0 = winY - opening.height / 2, y1 = winY + opening.height / 2;
    wallPiece(b - Math.PI / 2, w0, bottom, ceilingY);
    wallPiece(w1, b + Math.PI / 2, bottom, ceilingY);
    wallPiece(w0, w1, bottom, y0);
    wallPiece(w0, w1, y1, ceilingY);
    radialFace(w0, y0, y1);              // window reveal: jambs, sill, head
    radialFace(w1, y0, y1);
    ringFace(w0, w1, y0);
    ringFace(w0, w1, y1);
    for (let i = 1; i <= opening.bars; i++) {
      const geo = new THREE.CylinderGeometry(CELL.barRadius, CELL.barRadius, opening.height, 10);
      const bar = new THREE.Mesh(geo, barMat);
      bar.position.copy(onWall(w0 + (i * (w1 - w0)) / (opening.bars + 1), winY, CELL.radius + CELL.thickness / 2));
      bar.castShadow = true;
      wallGroup.add(bar); wallDisposables.push(geo);
    }
    winCentre.copy(onWall(b, winY));
    glow.scale.set(opening.width * 1.6, opening.height * 1.6, 1);
    glow.position.copy(onWall(b, winY, CELL.radius + CELL.thickness + 0.12));
    glow.lookAt(0, winY, 0);
    glow.visible = true;
  }

  // ── Lights ─────────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3b3b3b, 0.3);
  scene.add(hemi);

  // Fluorescents set into the ceiling: three tubes, each a soft area light,
  // plus one shadow-casting point so the mannequin still grounds itself.
  // Each tube has its own material and phase so they flicker independently.
  // The tubes run parallel to the section line, under the half-lid: local z
  // follows the cut, local -x points toward the back wall.
  const tubes = new THREE.Group();
  tubes.rotation.y = CELL.backAngle + Math.PI / 2;
  const tubeLights = [], tubeMats = [];
  const TUBE_OFFSETS = [0.18, 0.42, 0.66].map((f) => f * cellRadius);   // distance behind the cut
  for (const d of TUBE_OFFSETS) {           // three fixtures; the middle one is faulty
    const x = -d;
    const TUBE_LENGTH = Math.min(1.0, 2 * (Math.sqrt(cellRadius ** 2 - d ** 2) - 0.1));
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: FLUORESCENT, emissiveIntensity: 1 });
    tubeMats.push(tubeMat);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, TUBE_LENGTH), tubeMat);
    t.position.set(x, -0.02, 0);
    tubes.add(t);
    const l = new THREE.RectAreaLight(FLUORESCENT, 0, 0.12, TUBE_LENGTH);
    l.position.set(x, -0.04, 0);
    l.rotation.x = -Math.PI / 2;     // facing down
    tubes.add(l); tubeLights.push(l);
  }
  const tubeShadow = new THREE.PointLight(FLUORESCENT, 0, 0, 2);
  tubeShadow.position.set(-0.35 * cellRadius, -0.15, 0);
  tubeShadow.castShadow = true;
  tubeShadow.shadow.mapSize.set(1024, 1024);
  tubeShadow.shadow.camera.near = 0.05;
  tubeShadow.shadow.camera.far = 8;
  tubeShadow.shadow.bias = -0.002;
  tubeShadow.shadow.radius = 6;
  tubes.add(tubeShadow);
  cell.add(tubes);

  // Sunlight through the window: a spot outside the cell aimed through the
  // opening; the wall and bars cast the barred patch.
  const sunSpot = new THREE.SpotLight(WINDOW_SUN, 0, 0, 0.32, 0.35, 0);
  sunSpot.castShadow = true;
  sunSpot.shadow.mapSize.set(1024, 1024);
  sunSpot.shadow.bias = -0.0008;
  sunSpot.shadow.camera.near = 0.5;
  sunSpot.shadow.camera.far = 14;
  scene.add(sunSpot, sunSpot.target);

  const outdoorSun = new THREE.DirectionalLight(SUNLIGHT, 0);
  outdoorSun.castShadow = true;
  Object.assign(outdoorSun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
  outdoorSun.shadow.mapSize.set(2048, 2048);
  outdoorSun.shadow.radius = 3;
  outdoorSun.shadow.bias = -0.0005;
  scene.add(outdoorSun, outdoorSun.target);

  // ── Rings ──────────────────────────────────────────────────────────────
  function lathe(rIn, rOut, top, bottom, phiStart, phiLength) {
    const pts = rIn > 0
      ? [new THREE.Vector2(rIn, bottom), new THREE.Vector2(rIn, top), new THREE.Vector2(rOut, top), new THREE.Vector2(rOut, bottom)]
      : [new THREE.Vector2(0.0001, top), new THREE.Vector2(rOut, top), new THREE.Vector2(rOut, bottom)];
    return new THREE.LatheGeometry(pts, Math.max(8, Math.round(64 * phiLength / (Math.PI * 2))), phiStart, phiLength);
  }

  const disposables = [];
  function setScene(data, config) {
    for (const d of disposables.splice(0)) d.dispose();
    ringsGroup.clear();
    const bottom = Math.min(0, ...data.rings.map((r) => r.top)) - 0.25;
    ceilingY = Math.max(CELL.ceiling, data.rings[0].top + MANNEQUIN_HEIGHT + CELL.headroom);
    ceiling.position.y = ceilingY;
    tubes.position.y = ceilingY;
    buildWall(bottom, windowKind(data.light.daylight, lighting));
    const GAP = 0.025;

    for (const r of data.rings) {
      const [r0, r1] = r.radii;
      const rIn = r0 > 0 ? r0 + GAP : 0, rOut = r1 - GAP;
      if (!r.edges.length) {
        const geo = lathe(rIn, rOut, r.top, bottom, 0, Math.PI * 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x5c5c5a, roughness: 0.9, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat); m.receiveShadow = true;
        m.userData.ring = r.ring;
        ringsGroup.add(m); disposables.push(geo, mat);
      } else {
        // One unbroken band, colored and textured by the ring's average E.
        const kind = MATERIAL_FOR_STATE[stateFor(r.meanE, config).key];
        const [cr, cg, cb] = rgbFor(r.meanE, palette);
        const map = USE_TEXTURES ? tex[kind].clone() : null;
        if (map) { map.repeat.set(6, 2); map.needsUpdate = true; }
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setRGB(cr / 255, cg / 255, cb / 255, THREE.SRGBColorSpace),
          map, roughness: USE_TEXTURES ? ROUGHNESS[kind] : 0.85, side: THREE.DoubleSide, flatShading: true,
        });
        const geo = lathe(rIn, rOut, r.top, bottom, 0, Math.PI * 2);
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = m.receiveShadow = true;
        m.userData.ring = r.ring;
        ringsGroup.add(m); disposables.push(geo, mat, ...(map ? [map] : []));
      }
      if (r.own) {   // the opened capacity's home ring
        const geo = new THREE.TorusGeometry(rOut - 0.015, 0.018, 8, 128);
        const mat = new THREE.MeshBasicMaterial({ color: 0xf4f1e8 });
        const rim = new THREE.Mesh(geo, mat);
        rim.rotation.x = Math.PI / 2; rim.position.y = r.top + 0.02;
        ringsGroup.add(rim); disposables.push(geo, mat);
      }
    }

    mannequin.position.y = data.rings[0].top;

    bodyTop = data.rings[0].top;
    paintRings();
    placeCamera();
    if (data.mannequinE == null) skin.color.set(0x9a9a96);
    else { const [cr, cg, cb] = rgbFor(data.mannequinE, palette); skin.color.setRGB(cr / 255, cg / 255, cb / 255, THREE.SRGBColorSpace); }
  }

  // ── Lighting at a moment of the day ────────────────────────────────────
  function setLighting(s) {
    const f = s.fluorescent, o = s.outdoor;
    // Tubes are either on or out. When out (lights out at night), they go
    // fully dark and the remaining light is a dim, cool night ambient.
    const on = s.tubes;
    tubeLevel = f * on;                  // flicker is applied on top, per frame
    for (const m of tubeMats) m.color.set(s.tubes > 0.5 ? 0x111111 : 0x3a3c40);   // an unlit diffuser reads as a pale-gray fixture
    applyTubes(clock);
    cell.visible = o < 0.5;              // outdoors, the person has left the cell

    hemi.color.copy(NIGHT_AMBIENT).lerp(FLUORESCENT, on).lerp(new THREE.Color(0xcfe0f0), o);
    hemi.groundColor.set(0x3b3b3b).lerp(new THREE.Color(0x6b6252), o);
    hemi.intensity = 0.08 + 0.32 * f * on + 0.1 * (1 - on) + 1.1 * o;
    scene.background.copy(INDOOR_BG).lerp(SKY_BG, o);

    // Outdoors: the sun travels east → west; elevation peaks at midday.
    const az = Math.PI * s.sunAngle, el = 0.2 + 0.85 * Math.sin(Math.PI * s.sunAngle);
    outdoorSun.intensity = 3.2 * o;
    outdoorSun.position.set(Math.cos(az) * Math.cos(el), Math.sin(el), -0.55 * Math.cos(el)).normalize().multiplyScalar(14);

    // Through the window: the sun swings ±35° around the window's outward
    // normal and climbs toward midday, so the barred patch moves across the rings.
    const swing = (s.sunAngle - 0.5) * 1.2, rise = 0.35 + 0.45 * Math.sin(Math.PI * s.sunAngle);
    const outward = new THREE.Vector3(Math.sin(CELL.backAngle + swing), 0, Math.cos(CELL.backAngle + swing));
    const toSun = outward.multiplyScalar(Math.cos(rise)).setY(Math.sin(rise)).normalize();
    sunSpot.position.copy(winCentre).addScaledVector(toSun, 5);
    sunSpot.target.position.copy(winCentre).addScaledVector(toSun, -3);
    sunSpot.intensity = opening ? 9 * s.sun : 0;

    // Window glow: night → day sky by the clock, held toward a dull gray
    // when the architecture admits little daylight.
    const day = SKY_NIGHT.clone().lerp(SKY_DAY, s.sunUp);
    glowMat.color.copy(SKY_DIM.clone().lerp(SKY_NIGHT, 1 - s.sunUp).lerp(day, s.daylight));
  }

  // ── Fluorescent flicker ────────────────────────────────────────────────
  // Ported from the lighting lab (mains buzz + slow "breathing"), but
  // deterministic: seeded value noise of elapsed time and a fixed phase per
  // tube instead of Math.random(). Applies only while the tubes are on.
  const FLICKER = 0.15;                 // buzz amount, 0–1 (the lab's default). In code only.
  const PHASES = [17.3, 39.4, 61.9];
  const FAULTY = 1;                     // the middle tube stutters
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = (x) => { const i = Math.floor(x), u = x - i; return hash(i) + (hash(i + 1) - hash(i)) * u * u * (3 - 2 * u); };
  function flicker(t, ph) {
    let v = 1 - FLICKER * 0.35 * (0.5 + 0.5 * Math.sin(t * 90 + ph)) * noise(t * 60 + ph);   // mains buzz
    v *= 1 - FLICKER * 0.25 * Math.max(0, Math.sin(t * 1.7 + ph * 3)) ** 8;                 // slow breathing
    return v;
  }
  // Faulty tube (the middle one), from the lab: bursts of on/off stutter, all the
  // time. Deliberately random (user decision, 2026-10-03): it's texture,
  // not data, so it's the one non-deterministic element in the view.
  const fault = { on: true, until: 0 };
  function faulty(t) {
    const ms = t * 1000;
    if (ms > fault.until) {
      fault.on = Math.random() < 0.55;
      fault.until = ms + (fault.on ? 80 + Math.random() * 900 : 30 + Math.random() * 160);
    }
    return fault.on ? 1 : 0.04;
  }

  let tubeLevel = 0, clock = 0;
  function applyTubes(t) {
    let sum = 0;
    tubeLights.forEach((l, i) => {
      const lv = tubeLevel * flicker(t, PHASES[i]) * (i === FAULTY ? faulty(t) : 1);
      l.intensity = 11 * lv;   // per tube; three tubes ≈ the old two at 14
      tubeMats[i].emissiveIntensity = 2.6 * lv;
      sum += lv;
    });
    tubeShadow.intensity = 4 * (sum / tubeLights.length);
  }

  // ── Loop & resize ──────────────────────────────────────────────────────
  // Inactive (hidden in the main app), the loop idles without rendering.
  let onFrame = null, active = true;
  let last = performance.now();
  function frame(now) {
    const dt = (now - last) / 1000; last = now;
    if (!active) { requestAnimationFrame(frame); return; }
    clock += dt;
    onFrame?.(dt);
    if (tubeLevel > 0) applyTubes(clock);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ── Camera rig ─────────────────────────────────────────────────────────
  // Frontal, slightly raised view into the open half-cell. `follow` sets how
  // far the frame tracks the mannequin up or down: 0 = fixed frame sized for
  // the full mound/pit range, 1 = always centred on the person, between = both.
  const rig = { fov: 28, elevation: 20, follow: 0.5 };
  const FRAME = {
    centre: 0.8,           // frame centre for a flat scene (body top at 0)
    height: 2.7,           // cell height plus ring base, seen when following fully
    range: 2.4,            // extra height a fixed frame needs for the full mound/pit range
    width: 2 * (cellRadius + 0.06) * 1.2,
  };
  let bodyTop = 0;
  function placeCamera() {
    const f = rig.follow;
    const centre = FRAME.centre + f * bodyTop;
    const H = FRAME.height + (1 - f) * FRAME.range;
    const v = THREE.MathUtils.degToRad(rig.fov), el = THREE.MathUtils.degToRad(rig.elevation);
    const hfov = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const d = Math.max((H / 2) / Math.tan(v / 2), (FRAME.width / 2) / Math.tan(hfov / 2));
    const front = new THREE.Vector3(-Math.sin(CELL.backAngle), 0, -Math.cos(CELL.backAngle));
    controls.target.set(0, centre, 0);
    camera.fov = rig.fov;
    camera.position.set(front.x * Math.cos(el) * d, centre + Math.sin(el) * d, front.z * Math.cos(el) * d);
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
  }

  new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    placeCamera();
  }).observe(host);

  // Screen position of a point just above the mannequin's head, for the
  // thought-bubble overlay. Null when that point is behind the camera.
  const headPoint = new THREE.Vector3();
  function headScreen() {
    headPoint.copy(mannequin.position).y += MANNEQUIN_HEIGHT + 0.08;
    headPoint.project(camera);
    if (headPoint.z > 1) return null;
    return { x: (headPoint.x + 1) / 2 * host.clientWidth, y: (1 - headPoint.y) / 2 * host.clientHeight };
  }

  // ── Ring hover ─────────────────────────────────────────────────────────
  // A ray from the pointer finds the first ring under it; the mannequin
  // counts as the body ring (it covers most of the body disc). The hovered
  // ring brightens slightly; onRingHover(name, {x, y}) drives the label.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null, selected = null, onRingHover = null, onRingClick = null;
  function ringAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...ringsGroup.children, mannequin], true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && !o.userData.ring && o !== mannequin) o = o.parent;
    return o === mannequin ? 'body' : o?.userData.ring ?? null;
  }
  // Selected ring glows more strongly than a hovered one and stays lit.
  function paintRings() {
    for (const m of ringsGroup.children) {
      if (!m.material?.emissive || !m.userData.ring) continue;
      m.material.emissive.setScalar(m.userData.ring === selected ? 0.28 : m.userData.ring === hovered ? 0.12 : 0);
    }
  }
  function setHovered(name) {
    if (name === hovered) return;
    hovered = name;
    paintRings();
  }
  renderer.domElement.addEventListener('pointermove', (e) => {
    const name = ringAt(e.clientX, e.clientY);
    setHovered(name);
    renderer.domElement.style.cursor = name ? 'pointer' : '';
    onRingHover?.(name, { x: e.clientX, y: e.clientY });
  });
  renderer.domElement.addEventListener('pointerleave', () => { setHovered(null); onRingHover?.(null); });
  renderer.domElement.addEventListener('click', (e) => onRingClick?.(ringAt(e.clientX, e.clientY)));

  return {
    onRingHover: (fn) => { onRingHover = fn; },
    onRingClick: (fn) => { onRingClick = fn; },
    setSelectedRing: (name) => { selected = name; paintRings(); },
    setCameraRig: (opts) => { Object.assign(rig, opts); placeCamera(); },
    headScreen,
    setScene,
    setLighting,
    setPalette: (p) => { palette = p; },
    setActive: (on) => { active = on; last = performance.now(); },
    onFrame: (fn) => { onFrame = fn; },
  };
}
