const terrariumCascade = [
  { center: [1.51, 1.45, 1.47], halfWidth: 0.20 },
  { center: [1.62, 1.43, 1.81], halfWidth: 0.42 },
  { center: [1.66, 1.21, 1.97], halfWidth: 0.38 },
  { center: [1.59, 0.53, 2.18], halfWidth: 0.31 },
  { center: [1.55, 0.46, 2.47], halfWidth: 0.43 },
  { center: [1.54, 0.27, 2.62], halfWidth: 0.34 },
  { center: [1.58, -0.69, 2.80], halfWidth: 0.29 },
  { center: [1.63, -0.85, 3.02], halfWidth: 0.40 },
  { center: [1.60, -1.04, 3.16], halfWidth: 0.31 },
  { center: [1.60, -1.75, 3.42], halfWidth: 0.35 },
];

function terrariumCascadePoint(section, offset) {
  const { center: [x, y, z], halfWidth } = terrariumCascade[section];
  const ripple = Math.sin(section * 1.11 + offset * 1.7);
  return [x + halfWidth * offset, y + ripple * offset * 0.043, z + offset * 0.052];
}

const terrariumCascadeDistances = terrariumCascade.reduce((distances, { center }, index) => {
  const prior = terrariumCascade[index - 1];
  const step = prior ? Math.hypot(...center.map((value, axis) => value - prior.center[axis])) : 0;
  distances.push((distances[index - 1] || 0) + step);
  return distances;
}, []);

function makeTerrariumWaterfall({ addFace, addEdge }) {
  const bedrock = ["#15220e", "#1c2c12", "#233716", "#192a11", "#2a3c1a"];
  const lip = ["#344d23", "#45642d", "#273e20"];

  function rock(x, z, radiusX, radiusZ, topY, phase) {
    const angles = [0, 0.88, 1.94, 2.91, 3.99, 5.11];
    const lower = angles.map((angle, index) => {
      const jitter = index % 2 === 0 ? 1.04 : 0.83;
      return [x + Math.cos(angle + phase) * radiusX * jitter, -1.9, z + Math.sin(angle + phase) * radiusZ * jitter];
    });
    const upper = lower.map(([px, , pz]) => [x + (px - x) * 0.77, topY, z + (pz - z) * 0.83]);
    lower.forEach((corner, index) => {
      const next = (index + 1) % lower.length;
      addFace([corner, lower[next], upper[index]], bedrock[index % bedrock.length]);
      addFace([lower[next], upper[next], upper[index]], bedrock[index % bedrock.length]);
      if (index % 2 === 0) addEdge(upper[index], upper[next], "#5d7935");
    });
    upper.forEach((corner, index) => {
      addFace([[x, topY, z], corner, upper[(index + 1) % upper.length]], lip[index % lip.length]);
    });
  }

  rock(1.62, 2.09, 0.69, 0.46, 0.44, 0.11);
  rock(1.07, 2.28, 0.32, 0.32, -0.27, 0.47);
  rock(1.61, 2.60, 0.56, 0.43, -0.86, 0.33);
  rock(2.09, 2.56, 0.35, 0.32, -0.68, 0.04);

  const rows = terrariumCascade.map((_, section) => [-1, -0.29, 0.31, 1].map(offset => terrariumCascadePoint(section, offset)));
  const run = ["#355e42", "#4f7953", "#3d6848"];
  const fall = ["#315b43", "#548463", "#3a674c"];
  for (let row = 0; row < rows.length - 1; row++) {
    const color = row === 0 || row === 3 || row === 6 ? run : fall;
    for (let column = 0; column < color.length; column++) {
      const a = rows[row][column];
      const b = rows[row][column + 1];
      const c = rows[row + 1][column];
      const d = rows[row + 1][column + 1];
      addFace([a, b, c], color[column]);
      addFace([b, d, c], color[column]);
    }
  }

  for (const section of [1, 4, 7]) {
    addEdge(terrariumCascadePoint(section, -0.58), terrariumCascadePoint(section, 0.52), "#81a86a");
  }
  addEdge([1.43, -1.753, 3.43], [1.63, -1.753, 3.48], "#88aa65");
  addEdge([1.71, -1.753, 3.46], [1.82, -1.753, 3.52], "#729857");
}

function sampleTerrariumWaterfall(seconds, addEdge) {
  function along(progress, offset) {
    const last = terrariumCascadeDistances.length - 1;
    const length = Math.max(0, Math.min(1, progress)) * terrariumCascadeDistances[last];
    const upper = Math.max(1, terrariumCascadeDistances.findIndex(distance => distance >= length));
    const lower = upper - 1;
    const span = terrariumCascadeDistances[upper] - terrariumCascadeDistances[lower];
    const t = (length - terrariumCascadeDistances[lower]) / span;
    const start = terrariumCascadePoint(lower, offset);
    const end = terrariumCascadePoint(upper, offset);
    return start.map((value, axis) => value + (end[axis] - value) * t + (axis === 0 ? 0 : 0.026));
  }

  const shades = ["#81ad74", "#a0c47a", "#70986b"];
  for (const [offset, speed, phase] of [[-0.51, 0.60, 0.07], [0.10, 0.52, 0.42], [0.56, 0.67, 0.75]]) {
    const front = (seconds * speed + phase) % 1;
    let progress = Math.max(0, front - 0.15);
    let prior = along(progress, offset);
    for (let step = 0; step < shades.length; step++) {
      const nextProgress = front - 0.10 + step * 0.05;
      if (nextProgress - progress < 0.0001) continue;
      const next = along(nextProgress, offset);
      addEdge(prior, next, shades[step]);
      prior = next;
      progress = nextProgress;
    }
  }

  for (const offset of [0.12, 0.60]) {
    const phase = (seconds * 0.77 + offset) % 1;
    const radius = 0.11 + 0.34 * phase;
    const color = phase < 0.36 ? "#9bbb70" : phase < 0.72 ? "#6e995f" : "#4c784b";
    const at = angle => [1.60 + Math.cos(angle) * radius, -1.754, 3.44 + Math.sin(angle) * radius * 0.65];
    let prior = at(0.12);
    for (let step = 1; step <= 6; step++) {
      const next = at(0.12 + step * 0.47);
      addEdge(prior, next, color);
      prior = next;
    }
  }
}
