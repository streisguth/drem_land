const terrariumGlassProfile = [
  [10.53, -2.78], [10.56, -1.87], [10.64, 0.01], [10.66, 3.50],
  [10.62, 8.20], [10.56, 13.20], [10.49, 17.50], [10.37, 20.50],
  [10.14, 22.12], [9.48, 23.72], [8.42, 24.97], [7.13, 25.82], [5.54, 26.32],
];

const terrariumGlassSilhouettes = [
  { side: -1, tones: [
    "#344a20", "#455f2b", "#48632d", "#3d5427", "#394f25", "#45612e",
    "#506e33", "#5e813c", "#6d9248", "#607f3f", "#4c6731", "#3b5227",
  ] },
  { side: 1, tones: [
    "#30441f", "#40582a", "#3a5127", "#344a23", "#30441f", "#3f5729",
    "#4b6631", "#5a7738", "#628342", "#547138", "#445e2c", "#384e25",
  ] },
];

function sampleTerrariumGlass(angle, addEdge) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (const { side, tones } of terrariumGlassSilhouettes) {
    let previous = null;
    for (const [index, [radius, y]] of terrariumGlassProfile.entries()) {
      // A round vessel's outline sits at the camera tangent as its contents rotate.
      const point = [side * radius * cos, y, -side * radius * sin];
      if (previous) addEdge(previous, point, tones[index - 1]);
      previous = point;
    }
  }
}

function makeTerrariumFrame({ addFace, addEdge }) {
  const lime = "#c7ff37";
  const glassShadow = "#30451f";
  const glassMid = "#506d32";
  const glassLight = "#71974a";
  const glassGlint = "#a7cd60";
  const ink = "#050705";
  const darkCeramic = "#10170a";
  const ceramic = "#1c2a11";
  const tau = 2 * Math.PI;

  function point(radius, y, angle) {
    return [radius * Math.cos(angle), y, radius * Math.sin(angle)];
  }

  function ring(radius, y, sides = 28) {
    return Array.from({ length: sides }, (_, index) => point(radius, y, index * tau / sides));
  }

  function outline(points, color) {
    points.forEach((corner, index) => addEdge(corner, points[(index + 1) % points.length], color));
  }

  function band(lower, upper, color) {
    lower.forEach((corner, index) => {
      const next = (index + 1) % lower.length;
      addFace([corner, lower[next], upper[next], upper[index]], color);
    });
  }

  function arc(radius, y, start, end, color) {
    const steps = Math.max(2, Math.ceil((end - start) * radius / 0.5));
    let previous = point(radius, y, start);
    for (let i = 1; i <= steps; i++) {
      const next = point(radius, y, start + (end - start) * i / steps);
      addEdge(previous, next, color);
      previous = next;
    }
  }

  // A rounded, dark ceramic pedestal grounds the jar and occludes the far rim.
  const foot = ring(9.48, -5.48);
  const footCurve = ring(10.12, -5.12);
  const base = ring(10.56, -4.58);
  const lip = ring(10.72, -3.55);
  const seal = ring(10.53, -2.79);
  addFace(foot, ink);
  band(foot, footCurve, darkCeramic);
  band(footCurve, base, ceramic);
  band(base, lip, darkCeramic);
  band(lip, seal, ceramic);
  addFace(seal, ink);
  outline(footCurve, glassShadow);
  outline(lip, glassMid);
  outline(seal, glassLight);
  arc(10.61, -3.95, 0.77, 1.24, glassGlint);
  arc(10.57, -2.77, 2.28, 2.65, lime);
  arc(10.57, -2.77, 4.66, 5.32, glassGlint);

  // Sparse bowed reflections leave the view into the garden open.
  function reflection(angle, bow, from, through, tones, inward = 0) {
    let previous = null;
    for (let i = from; i <= through; i++) {
      const [radius, y] = terrariumGlassProfile[i];
      const drift = bow * Math.sin((i / (terrariumGlassProfile.length - 1)) * Math.PI);
      const next = point(radius - inward, y, angle + drift);
      if (previous) addEdge(previous, next, tones[(i - from - 1) % tones.length]);
      previous = next;
    }
  }

  reflection(0.61, -0.07, 2, 5, [glassShadow, glassMid, glassLight], 0.19);
  reflection(2.72, 0.08, 5, 8, [glassShadow, glassMid, glassShadow], 0.12);
  reflection(4.05, -0.12, 7, 12, [glassShadow, glassMid, glassLight, glassMid, glassShadow], 0.10);
  reflection(5.58, 0.09, 8, 12, [glassShadow, glassLight, glassMid, glassShadow]);
  arc(8.96, 24.46, 0.93, 1.32, glassMid);
  arc(8.96, 24.46, 3.50, 3.88, glassShadow);
  arc(7.74, 25.50, 5.40, 5.74, glassLight);

  // A round lid and small smooth knob give the top a softer silhouette.
  const collar = ring(5.66, 26.27);
  const lidRim = ring(5.52, 26.62);
  const lidTop = ring(5.15, 26.81);
  band(collar, lidRim, darkCeramic);
  band(lidRim, lidTop, ceramic);
  addFace(lidTop, ink);
  outline(collar, glassMid);
  outline(lidTop, glassLight);
  arc(5.20, 26.84, 1.48, 2.14, glassGlint);
  arc(5.20, 26.84, 4.00, 4.46, lime);

  const knobFoot = ring(1.08, 26.82, 16);
  const knobNeck = ring(0.92, 27.12, 16);
  const knobBelly = ring(1.58, 27.56, 16);
  const knobShoulder = ring(1.48, 28.12, 16);
  const knobTop = ring(0.81, 28.59, 16);
  band(knobFoot, knobNeck, darkCeramic);
  band(knobNeck, knobBelly, ceramic);
  band(knobBelly, knobShoulder, darkCeramic);
  band(knobShoulder, knobTop, ceramic);
  addFace(knobTop, ink);
  outline(knobBelly, glassMid);
  outline(knobTop, glassLight);
  arc(0.83, 28.60, 0.06, 1.56, glassGlint);
}
