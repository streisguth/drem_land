function makeTerrariumTerrain({ addFace, addEdge }) {
  const soil = ["#18250d", "#1c2c10", "#202e12", "#253415"];
  const moss = ["#537029", "#688a32", "#86a847", "#abc965"];
  const peatEdge = "#364d20";
  const bankEdge = "#637f37";
  const pondFloor = -1.78;

  const bed = [
    [-8.4, -4.85], [-4.85, -8.4], [4.75, -8.4], [8.4, -4.75],
    [8.4, 4.65], [4.65, 8.4], [-4.75, 8.4], [-8.4, 4.75],
  ];
  const mid = [
    [-6.48, -2.7], [-5.42, -4.95], [-2.9, -6.2], [2.42, -6.15],
    [4.75, -4.72], [5.46, -1.65], [4.72, 0.76], [2.82, 1.9],
    [-2.65, 2.17], [-5.58, 1.12],
  ];
  const upper = [
    [-3.27, -3.18], [-2.23, -5.18], [-0.18, -5.58], [2.31, -5.20],
    [3.23, -3.8], [2.53, -1.71], [0.68, -1.11], [-1.86, -1.32], [-2.96, -1.92],
  ];
  const pond = [
    [-2.69, 4.65], [-2.61, 3.81], [-2.25, 3.25], [-1.76, 3.02],
    [-1.28, 3.09], [-0.98, 3.48], [-0.86, 3.95], [-0.59, 4.26],
    [-0.21, 4.42], [0.22, 4.38], [0.55, 4.16], [0.73, 3.62],
    [0.89, 3.14], [1.19, 2.79], [1.55, 2.65], [1.97, 2.71],
    [2.29, 2.97], [2.49, 3.47], [2.63, 4.01], [2.72, 4.54],
    [2.72, 5.05], [2.53, 5.52], [2.21, 5.90], [1.72, 6.22],
    [1.22, 6.50], [0.53, 6.65], [-0.20, 6.74], [-0.96, 6.65],
    [-1.61, 6.50], [-2.13, 6.22], [-2.49, 5.80], [-2.67, 5.24],
  ];

  const raised = (outline, y, scale = 1, [cx, cz] = [0, 0]) => outline.map(([x, z]) => [
    cx + (x - cx) * scale, y, cz + (z - cz) * scale,
  ]);
  const mix = (a, b, amount) => a.map((value, index) => value + (b[index] - value) * amount);

  function outline(ring, color) {
    ring.forEach((point, index) => addEdge(point, ring[(index + 1) % ring.length], color));
  }

  function sideBand(lower, upperRing, colors) {
    lower.forEach((point, index) => {
      const next = (index + 1) % lower.length;
      addFace([point, lower[next], upperRing[next], upperRing[index]], colors[index % colors.length]);
    });
  }

  function path(points, color) {
    for (let index = 1; index < points.length; index++) {
      addEdge(points[index - 1], points[index], color);
    }
  }

  function seam(lower, upperRing, index, color, bend = 0) {
    const next = (index + 1) % lower.length;
    const onFace = (horizontal, height) => mix(
      mix(lower[index], lower[next], horizontal),
      mix(upperRing[index], upperRing[next], horizontal),
      height,
    );
    path([onFace(0.06, 0.47), onFace(0.32, 0.62 + bend), onFace(0.65, 0.40), onFace(0.91, 0.52)], color);
  }

  const bedBottom = raised(bed, -3.02, 0.91);
  const bedBevel = raised(bed, -2.7);
  const bedSeam = raised(bed, -2.12, 0.986);
  const bedTop = raised(bed, -1.3, 0.97);
  addFace(bedBottom, "#050505");
  sideBand(bedBottom, bedBevel, ["#050505", "#080a04"]);
  sideBand(bedBevel, bedSeam, ["#111a09", "#10190b", "#141e0c"]);
  sideBand(bedSeam, bedTop, soil);
  outline(bedBevel, "#273811");
  outline(bedSeam, "#324716");
  outline(bedTop, peatEdge);
  for (let index = 0; index < bed.length; index++) {
    addEdge(bedBevel[index], bedTop[index], "#3b511a");
    seam(bedSeam, bedTop, index, moss[index % 2], index % 2 ? -0.12 : 0.05);
  }

  // Each x slice crosses one continuous interval of either outline. Matching
  // their x cuts leaves the kidney-shaped hole open without drawing mesh seams.
  function zExtent(ring, x) {
    let rear = Infinity;
    let front = -Infinity;
    for (let index = 0; index < ring.length; index++) {
      const [ax, , az] = ring[index];
      const [bx, , bz] = ring[(index + 1) % ring.length];
      if (x < Math.min(ax, bx) || x > Math.max(ax, bx)) continue;
      if (ax === bx) {
        rear = Math.min(rear, az, bz);
        front = Math.max(front, az, bz);
      } else {
        const z = az + (bz - az) * (x - ax) / (bx - ax);
        rear = Math.min(rear, z);
        front = Math.max(front, z);
      }
    }
    return [rear, front];
  }

  function horizontalStrip(x0, x1, left, right, y, color) {
    const rearLeft = [x0, y, left[0]];
    const rearRight = [x1, y, right[0]];
    const frontRight = [x1, y, right[1]];
    const frontLeft = [x0, y, left[1]];
    if (right[1] - right[0] > 1e-8) addFace([rearLeft, rearRight, frontRight], color);
    if (left[1] - left[0] > 1e-8) addFace([rearLeft, frontRight, frontLeft], color);
  }

  const xCuts = (...rings) => [...new Set(rings.flatMap(ring => ring.map(([x]) => x)))].sort((a, b) => a - b);
  const pondRim = raised(pond, -1.3);
  const pondBottom = raised(pond, pondFloor, 0.967, [0, 5.15]);
  const groundCuts = xCuts(bedTop, pondRim);
  const rimCuts = xCuts(pondRim);
  const firstPondX = rimCuts[0];
  const lastPondX = rimCuts[rimCuts.length - 1];
  for (let index = 0; index < groundCuts.length - 1; index++) {
    const x0 = groundCuts[index];
    const x1 = groundCuts[index + 1];
    const left = zExtent(bedTop, x0);
    const right = zExtent(bedTop, x1);
    if (x1 <= firstPondX || x0 >= lastPondX) {
      horizontalStrip(x0, x1, left, right, -1.3, soil[2]);
      continue;
    }
    const leftWater = zExtent(pondRim, x0);
    const rightWater = zExtent(pondRim, x1);
    horizontalStrip(x0, x1, [left[0], leftWater[0]], [right[0], rightWater[0]], -1.3, soil[2]);
    horizontalStrip(x0, x1, [leftWater[1], left[1]], [rightWater[1], right[1]], -1.3, soil[2]);
  }
  sideBand(pondBottom, pondRim, ["#182d16", "#142614", "#1d331a"]);
  const waterCuts = xCuts(pondBottom);
  for (let index = 0; index < waterCuts.length - 1; index++) {
    const x0 = waterCuts[index];
    const x1 = waterCuts[index + 1];
    horizontalStrip(x0, x1, zExtent(pondBottom, x0), zExtent(pondBottom, x1), pondFloor, "#193820");
  }
  outline(pondRim, bankEdge);
  outline(pondBottom, "#3a5c31");
  for (const index of [1, 3, 6, 7, 9, 10, 14, 22, 25, 28, 30]) {
    const next = (index + 1) % pondRim.length;
    addEdge(mix(pondRim[index], pondRim[next], 0.12), mix(pondRim[index], pondRim[next], 0.85), moss[index % moss.length]);
  }

  const waterY = pondFloor + 0.045;
  path([[-2.13, waterY, 4.01], [-1.99, waterY, 3.76], [-1.72, waterY, 3.56]], "#51764a");
  path([[-2.00, waterY, 5.43], [-1.59, waterY, 5.68], [-1.21, waterY, 5.83]], "#46693f");
  path([[1.04, waterY, 4.78], [1.53, waterY, 4.59], [2.03, waterY, 4.68]], "#5a7d49");
  path([[-0.67, waterY, 6.15], [0.10, waterY, 6.25], [0.86, waterY, 6.13]], "#436841");

  function lilyPad(x, z, radius, heading) {
    const center = [x, waterY + 0.07, z];
    const rim = Array.from({ length: 8 }, (_, index) => {
      const angle = heading + (index / 7) * (2 * Math.PI - 0.58);
      return [x + Math.cos(angle) * radius, center[1], z + Math.sin(angle) * radius * 0.83];
    });
    for (let index = 0; index < rim.length - 1; index++) {
      addFace([center, rim[index], rim[index + 1]], index < 4 ? "#527b32" : "#3b5d24");
      addEdge(rim[index], rim[index + 1], index < 3 ? "#91b550" : "#658e36");
    }
    addEdge(center, rim[0], "#a4bf57");
    addEdge(center, rim[rim.length - 1], "#779943");
  }

  lilyPad(-1.58, 4.71, 0.68, 0.2);
  lilyPad(-0.33, 5.27, 0.37, 2.2);
  lilyPad(1.27, 5.73, 0.56, 3.0);

  function terrace(profile, bottomY, topY, center, edge) {
    const skirt = raised(profile, bottomY, 1, center);
    const cut = raised(profile, bottomY + (topY - bottomY) * 0.46, 0.97, center);
    const roof = raised(profile, topY, 0.91, center);
    addFace(skirt, "#050505");
    sideBand(skirt, cut, ["#101b09", "#152009", "#1a260d"]);
    sideBand(cut, roof, soil);
    addFace(roof, "#2a4218");
    outline(skirt, "#425a19");
    outline(cut, "#4a651b");
    outline(roof, edge);

    roof.forEach((point, index) => {
      addEdge(skirt[index], point, index % 3 ? "#2b3e1a" : moss[0]);
      if (index % 3 === 1) seam(cut, roof, index, moss[1], 0.03);
      if (index % 3 === 2) seam(skirt, cut, index, moss[0], -0.08);
    });
    return roof;
  }

  const topOfMid = terrace(mid, -1.28, 1.4, [-0.35, -1.8], bankEdge);
  const topOfUpper = terrace(upper, 1.42, 4.2, [0, -3.42], "#79942e");

  function terraceEtches(ring, center, accents) {
    accents.forEach((index, step) => {
      const next = (index + 1) % ring.length;
      const point = mix(ring[index], center, 0.14);
      const end = mix(ring[next], center, 0.15 + (step % 2) * 0.08);
      point[1] += 0.025;
      end[1] += 0.025;
      addEdge(mix(point, end, 0.19), mix(point, end, 0.71), moss[step % 3]);
    });
  }

  terraceEtches(topOfMid, [-0.35, 1.4, -1.8], [0, 4, 6, 7, 8]);
  terraceEtches(topOfUpper, [0, 4.2, -3.42], [2, 4, 5, 7]);

  function pebble(x, z, floor, radius, height, tilt) {
    const profile = [
      [-0.95, -0.13], [-0.56, -0.68], [0.28, -0.73], [0.93, -0.28],
      [0.8, 0.38], [0.21, 0.67], [-0.53, 0.56],
    ].map(([px, pz]) => [x + (px + pz * tilt) * radius, z + (pz - px * tilt) * radius]);
    const bottom = raised(profile, floor, 1, [x, z]);
    const belt = raised(profile, floor + height * 0.39, 1.02, [x, z]);
    const top = raised(profile, floor + height, 0.63, [x, z]);
    sideBand(bottom, belt, ["#161d10", "#182012", "#1c2415"]);
    sideBand(belt, top, ["#28371a", "#1d2a16", "#24341a"]);
    addFace(top, "#344b27");
    outline(belt, "#3f5621");
    outline(top, "#6d8c31");
    for (const index of [0, 2, 4]) addEdge(belt[index], top[index], "#567226");
  }

  for (const placement of [
    [-6.88, 3.11, -1.3, 0.95, 0.9, -0.3], [-7.30, 4.32, -1.3, 0.58, 0.46, 0.35],
    [3.67, 6.53, -1.3, 0.92, 0.74, 0.45], [2.93, 7.32, -1.3, 0.49, 0.43, -0.5],
    [6.48, 1.46, -1.3, 0.81, 0.85, -0.36], [5.22, -6.55, -1.3, 0.82, 0.66, 0.3],
    [-6.66, -5.65, -1.3, 0.87, 0.82, -0.47], [-3.72, -6.91, -1.3, 0.51, 0.53, 0.2],
    [3.69, -1.2, 1.4, 0.78, 0.68, 0.27], [-2.47, -2.9, 4.2, 0.54, 0.62, 0.2],
    [1.98, -4.01, 4.2, 0.49, 0.54, -0.36],
  ]) pebble(...placement);

  function mossStroke(x, y, z, direction, color) {
    path([[x - 0.29, y, z - 0.07], [x, y + 0.27, z], [x + direction * 0.33, y + 0.39, z - 0.12]], color);
    addEdge([x, y + 0.27, z], [x + direction * 0.20, y + 0.13, z + 0.29], moss[0]);
  }

  [
    [-2.9, -1.28, 4.82], [-2.49, -1.28, 6.53], [2.95, -1.28, 5.36], [1.83, -1.28, 7.14],
    [-6.92, -1.28, -1.24], [7.22, -1.28, -0.65], [2.23, -1.28, -6.7], [-1.05, -1.28, -7.05],
    [1.8, 1.42, 0.69], [-3.44, 1.42, 0.61], [2.23, 4.22, -2.58], [-0.84, 4.22, -1.83],
  ].forEach(([x, y, z], index) => mossStroke(x, y, z, index % 2 ? -1 : 1, moss[(index + 2) % moss.length]));
}
