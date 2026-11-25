function makeTerrariumUndergrowth({ addFace, addEdge }) {
  const palettes = [
    { shade: "#20340f", body: "#3d6020", light: "#638b2d", rim: "#8aac3d", vein: "#789739" },
    { shade: "#193111", body: "#365928", light: "#567c37", rim: "#7fa54c", vein: "#688e42" },
    { shade: "#2a3b0c", body: "#4d6b1c", light: "#769735", rim: "#a3c54a", vein: "#8bab3d" },
  ];
  const softGold = { shade: "#374820", body: "#627848", light: "#91a960", rim: "#a8bf78", vein: "#789353" };
  const tau = Math.PI * 2;

  function point(origin, angle, distance, rise = 0) {
    return [origin[0] + Math.cos(angle) * distance, origin[1] + rise, origin[2] + Math.sin(angle) * distance];
  }

  function blend(a, b, amount) {
    return a.map((value, axis) => value + (b[axis] - value) * amount);
  }

  // Broad, bowed leaves use a few opaque panels to read as silhouettes at phone size.
  function leaf(base, tip, width, palette, accent = false) {
    const heading = Math.atan2(tip[2] - base[2], tip[0] - base[0]);
    const leftward = heading - Math.PI / 2;
    const rightward = heading + Math.PI / 2;
    const lower = blend(base, tip, 0.31);
    const upper = blend(base, tip, 0.7);
    const fold = blend(base, tip, 0.53);
    fold[1] += width * 0.38;
    const leftHeel = point(lower, leftward, width * 0.72, -width * 0.02);
    const leftShoulder = point(upper, leftward, width, width * 0.13);
    const rightShoulder = point(upper, rightward, width * 0.85, 0);
    const rightHeel = point(lower, rightward, width * 0.55, -width * 0.08);

    addFace([base, leftHeel, fold], palette.body);
    addFace([leftHeel, leftShoulder, fold], palette.light);
    addFace([leftShoulder, tip, fold], palette.light);
    addFace([tip, rightShoulder, fold], palette.body);
    addFace([rightShoulder, rightHeel, fold], palette.shade);
    addFace([rightHeel, base, fold], palette.shade);
    addEdge(leftShoulder, tip, accent ? "#b3d658" : palette.rim);
    if (width > 0.2) addEdge(blend(base, fold, 0.42), blend(fold, tip, 0.38), palette.vein);
  }

  function rosette(origin, size, angle, palette) {
    const leaves = [
      [-0.54, 1.19, 0.37, 0.34], [0.69, 1.07, 0.57, 0.36], [1.66, 0.94, 1.10, 0.30],
      [2.86, 1.18, 0.61, 0.34], [4.01, 1.03, 0.47, 0.36], [4.97, 0.79, 1.05, 0.27],
      [0.19, 0.57, 1.34, 0.22],
    ];
    leaves.forEach(([offset, reach, rise, width], index) => {
      const heading = angle + offset;
      const base = point(origin, heading, size * 0.07, size * 0.11);
      leaf(base, point(origin, heading, reach * size, rise * size), width * size, palette, index === 2);
    });
  }

  function shoulder(origin, size, angle, palette, full = false) {
    const lower = point(origin, angle + 2.9, 0.19 * size, 0.69 * size);
    const middle = point(origin, angle + 1.1, 0.24 * size, 1.54 * size);
    const upper = point(origin, angle, 0.29 * size, 2.35 * size);
    if (full) {
      const outside = point(middle, 2.08, 0.56 * size, -0.45 * size);
      const inland = point(middle, 0.92, 0.31 * size, -0.23 * size);
      mound(outside, 0.58 * size, 0.68 * size, angle + 0.37, palette, 1.11);
      mound(inland, 0.51 * size, 0.65 * size, angle, palettes[1], 0.94);
    }
    addEdge(origin, lower, palette.body);
    addEdge(lower, middle, palette.vein);
    addEdge(middle, upper, palette.vein);
    const layers = [
      [lower, 1.09, 0.73, 0.41, [0.33, 2.39, 4.45]],
      [middle, 1.16, 0.63, 0.39, [1.02, 3.12, 5.14]],
      [upper, 0.93, 0.62, 0.29, [0.28, 2.72, 4.73]],
    ];
    layers.forEach(([base, reach, rise, width, turns], tier) => {
      turns.forEach((offset, index) => {
        const heading = angle + offset;
        const tip = point(base, heading, reach * size * (1 - index * 0.075), (rise + index * 0.1) * size);
        leaf(base, tip, width * size, palette, tier === 2 && index === 1);
      });
    });
    leaf(upper, point(upper, angle + 0.8, 0.44 * size, 0.75 * size), 0.23 * size, palette, true);
  }

  function mound(origin, radius, rise, angle, palette, stretch) {
    const contour = [0.93, 1.08, 0.94, 1.02, 0.95, 0.86, 1.03];
    function ring(scale, height) {
      return contour.map((relative, index) => {
        const t = index * tau / contour.length;
        const u = Math.cos(t) * radius * relative * scale;
        const v = Math.sin(t) * radius * relative * scale * stretch;
        return [origin[0] + Math.cos(angle) * u - Math.sin(angle) * v,
          origin[1] + height, origin[2] + Math.sin(angle) * u + Math.cos(angle) * v];
      });
    }
    const skirt = ring(0.82, 0);
    const middle = ring(1, rise * 0.42);
    const crown = ring(0.59, rise);
    skirt.forEach((corner, index) => {
      const next = (index + 1) % skirt.length;
      addFace([corner, skirt[next], middle[next], middle[index]], palette.shade);
      addFace([middle[index], middle[next], crown[next], crown[index]], index % 3 === 1 ? palette.light : palette.body);
      if (index % 3 === 1) addEdge(crown[index], crown[next], palette.rim);
    });
    addFace(crown, palette.light);
  }

  function cushion(origin, size, angle, palette, full = false) {
    const lobes = [[0, 0, 0.78, 0.57], [0.78, 0.62, 0.57, 0.44], [2.88, 0.68, 0.59, 0.48]];
    if (full) lobes.push([4.92, 0.51, 0.46, 0.35]);
    lobes.forEach(([offset, spread, radius, height], index) => {
      const direction = angle + offset;
      const base = point(origin, direction, spread * size);
      mound(base, radius * size, height * size, direction, index === 1 ? palettes[1] : palette, 0.86);
    });
  }

  function reeds(origin, size, angle, palette) {
    for (const [offset, reach, rise, breadth] of [[-0.78, 0.53, 1.49, 0.15], [0.28, 0.32, 2.03, 0.16], [1.3, 0.61, 1.33, 0.16]]) {
      const heading = angle + offset;
      const base = point(origin, heading, 0.14 * size);
      leaf(base, point(base, heading, reach * size, rise * size), breadth * size, palette);
    }
  }

  function groundcover(origin, size, angle, palette) {
    for (const [offset, distance, rise] of [[-0.52, 0.69, 0.16], [1.21, 0.9, 0.31], [3.3, 0.76, 0.22]]) {
      const heading = angle + offset;
      const base = point(origin, heading, 0.13 * size, 0.03 * size);
      leaf(base, point(origin, heading, distance * size, rise * size), 0.22 * size, palette);
    }
  }

  function mushrooms(origin, size, angle) {
    for (const [offset, distance, height, radius] of [[0, 0.07, 0.89, 0.47], [2.44, 0.53, 0.55, 0.33]]) {
      const heading = angle + offset;
      const foot = point(origin, heading, distance * size);
      const crown = point(foot, heading, 0.08 * size, height * size);
      const skirt = Array.from({ length: 5 }, (_, index) => point(foot, heading + index * tau / 5, radius * size * 0.23));
      const neck = Array.from({ length: 5 }, (_, index) => point(crown, heading + index * tau / 5, radius * size * 0.20));
      skirt.forEach((corner, index) => {
        const next = (index + 1) % skirt.length;
        addFace([corner, skirt[next], neck[next], neck[index]], index % 3 ? softGold.shade : softGold.body);
      });
      mound(crown, radius * size, radius * size * 0.62, heading, softGold, 0.89);
    }
  }

  // Successive terraces alternate low, padded planting with taller leafy shoulders.
  // The west bank is deeper and busier, and the center of the foreground pond stays open.
  const beds = [
    {
      y: -1.3,
      plants: [
        [-6.07, 2.10, 1.24, 1.36, "rosette"], [-6.67, 1.37, 0.91, 2.60, "cushion"],
        [-7.08, 0.22, 0.94, 1.15, "cushion"], [-5.55, 2.91, 1.27, 4.01, "cushion", true],
        [-4.65, 3.32, 0.92, 2.40, "mushrooms"], [-3.24, 3.48, 0.95, 2.95, "reeds"],
        [-4.04, 4.11, 1.02, 3.54, "cover"], [-4.70, 4.70, 1.06, 2.60, "rosette"],
        [-5.42, 5.63, 0.95, 1.47, "mushrooms"], [-4.23, 5.79, 0.93, 1.27, "cushion", true],
        [-3.51, 6.03, 0.76, 2.75, "cover"], [-2.49, 7.02, 0.89, 4.78, "cushion"],
        [-0.93, 7.46, 0.64, 4.23, "reeds"], [-7.18, -3.65, 0.91, 0.32, "cushion"],
        [-5.64, -5.88, 1.09, 0.14, "rosette"], [-4.25, -6.21, 0.94, 1.22, "mushrooms"],
        [-2.05, -6.81, 1.07, 4.31, "cushion"], [-0.11, -7.15, 0.91, 1.38, "rosette"],
        [1.78, -7.10, 0.90, 2.07, "cover"], [3.67, -6.11, 0.95, 3.42, "cushion"],
        [5.57, -4.43, 1.13, 2.43, "rosette"], [6.67, -2.38, 1.08, 3.67, "cushion"],
        [7.05, -0.48, 0.87, 0.12, "mushrooms"], [6.46, 2.79, 1.01, 2.96, "rosette"],
        [5.82, 3.94, 0.83, 1.73, "cushion"], [3.08, 3.92, 0.73, 1.63, "reeds"],
      ],
    },
    {
      y: 1.4,
      plants: [
        [-4.98, -0.18, 2.23, 2.70, "shoulder", true], [-3.58, 0.37, 0.97, 1.57, "cushion"],
        [-1.75, 1.03, 0.92, 1.36, "rosette"], [-4.71, -1.33, 0.79, 4.20, "mushrooms"],
        [-4.34, -2.31, 1.01, 3.93, "rosette"], [-4.36, -4.05, 1.57, 1.43, "shoulder"],
        [-2.83, -5.35, 1.04, 3.67, "cushion"], [0.28, -5.76, 0.75, 2.18, "cover"],
        [3.45, -4.65, 0.96, 5.36, "rosette"], [4.42, -2.62, 2.06, 2.88, "shoulder"],
        [2.89, 0.58, 0.90, 3.79, "cushion"], [0.71, 1.07, 0.80, 3.43, "cover"],
      ],
    },
    {
      y: 4.2,
      plants: [
        [-1.84, -4.38, 0.78, 0.55, "cushion"], [-1.67, -2.09, 0.86, 2.19, "rosette"],
        [-0.54, -1.80, 0.64, 1.55, "mushrooms"], [0.67, -1.75, 0.79, 3.68, "cover"],
        [2.02, -2.63, 0.88, 0.15, "rosette"], [1.31, -4.79, 0.82, 5.91, "cushion"],
      ],
    },
  ];
  const plants = { rosette, shoulder, cushion, reeds, cover: groundcover, mushrooms };

  beds.forEach(({ y, plants: bed }, tier) => {
    bed.forEach(([x, z, size, angle, kind, full], index) => {
      const room = Math.min(8.48 - Math.abs(x), 8.48 - Math.abs(z), (14.45 - Math.abs(x) - Math.abs(z)) / Math.SQRT2);
      const scale = Math.min(size, room / 1.31);
      const palette = palettes[(index + tier * 2) % palettes.length];
      plants[kind]([x, y + 0.01, z], scale, angle, palette, full);
    });
  });
}
