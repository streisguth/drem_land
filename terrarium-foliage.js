function makeTerrariumFoliage({ addFace, addEdge }) {
  const tau = 2 * Math.PI;
  const lime = "#c7ff37";
  const bark = ["#151d0b", "#273413", "#34431a", "#263312", "#1d260e", "#11180a"];
  const barkVein = ["#435723", "#596e2a", "#6d8232", "#53682a", "#465a24", "#3b4c1e"];
  const greens = [
    ["#21370d", "#36541a", "#436922", "#56812c", "#668f35", "#82a543"],
    ["#253c10", "#3b5a1d", "#496d24", "#5e7f30", "#73923a", "#92ae43"],
    ["#243413", "#354c19", "#486122", "#59782a", "#6b8933", "#86a43e"],
  ];
  const wave = (seed) => 0.5 + 0.5 * Math.sin(seed);
  const move = (point, direction, distance) => point.map((value, axis) => value + direction[axis] * distance);
  const diff = (a, b) => a.map((value, axis) => value - b[axis]);
  const mix = (a, b, amount) => move(a, diff(b, a), amount);
  function unit(vector) {
    const magnitude = Math.hypot(...vector);
    return vector.map((component) => component / magnitude);
  }
  const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];

  function branch(points, radii, phase, highlights = false) {
    const segmentCount = 6;
    const axis = unit(diff(points[points.length - 1], points[0]));
    const reference = Math.abs(axis[2]) > 0.74 ? [1, 0, 0] : [0, 0, 1];
    const rings = points.map((point, index) => {
      const localAxis = unit(diff(points[Math.min(index + 1, points.length - 1)], points[Math.max(0, index - 1)]));
      const across = unit(cross(localAxis, reference));
      const up = cross(across, localAxis);
      return Array.from({ length: segmentCount }, (_, sector) => {
        const angle = phase + sector * tau / segmentCount + index * 0.074;
        return move(move(point, across, radii[index] * Math.cos(angle)), up, radii[index] * 0.84 * Math.sin(angle));
      });
    });

    addFace(rings[0], bark[0]);
    addFace(rings[rings.length - 1], bark[2]);
    for (let section = 0; section < rings.length - 1; section++) {
      for (let side = 0; side < segmentCount; side++) {
        const next = (side + 1) % segmentCount;
        const a = rings[section][side];
        const b = rings[section][next];
        const c = rings[section + 1][next];
        const d = rings[section + 1][side];
        addFace([a, b, d], bark[side]);
        addFace([b, c, d], bark[side]);
        if (highlights && side % 2 === 0) addEdge(a, d, barkVein[side]);
      }
    }
  }

  const trunk = [
    [-0.47, 4.16, -3.56], [0.26, 5.57, -3.58], [0.76, 7.28, -3.33],
    [0.24, 9.08, -2.91], [-1.08, 11.47, -2.8], [-0.76, 14.12, -3.07],
    [0.35, 16.63, -3.02], [1.37, 18.86, -2.40],
  ];
  branch(trunk, [1.5, 1.29, 1.1, 0.91, 0.77, 0.58, 0.37, 0.16], 0.36, true);
  branch([[0, 4.81, -3.9], [-1.14, 4.55, -4.12], [-2.56, 4.21, -4.47]], [0.50, 0.26, 0.06], 0.61);
  branch([[0.4, 4.67, -3.28], [1.16, 4.48, -2.8], [1.84, 4.22, -2.31]], [0.43, 0.24, 0.06], 0.18);
  branch([[-0.02, 4.80, -3.04], [-0.91, 4.57, -2.65], [-1.45, 4.22, -2.16]], [0.35, 0.19, 0.06], 0.14);
  branch([trunk[3], [-1.75, 8.91, -2.43], [-3.43, 9.1, -2.65], [-4.68, 10.62, -2.75]], [0.74, 0.62, 0.43, 0.14], 0.28, true);
  branch([trunk[3], [0.57, 9.17, -1.22], [0.32, 10.08, 1.41], [-0.12, 11.41, 2.85]], [0.65, 0.53, 0.33, 0.12], 0.82);
  branch([trunk[4], [1.3, 11.97, -3.23], [2.56, 12.63, -2.31], [3.91, 13.32, -1.65]], [0.66, 0.50, 0.35, 0.14], 0.54, true);
  branch([trunk[4], [-0.58, 12.2, -4.3], [0.11, 14.18, -5.57]], [0.49, 0.35, 0.13], 0.74);
  branch([trunk[5], [-2.48, 14.65, -2.28], [-3.54, 16.37, -2.95]], [0.51, 0.34, 0.14], 0.17, true);

  function tuft(center, radii, phase, palette, accent) {
    const [rx, ry, rz] = radii;
    const sectors = 7;
    const rim = Array.from({ length: sectors }, (_, index) => {
      const angle = phase + index * tau / sectors;
      const bump = 0.83 + 0.18 * wave(phase * 3.1 + index * 5.2);
      return [
        center[0] + Math.cos(angle) * rx * bump,
        center[1] + ry * (wave(phase + index * 2.7) - 0.48) * 0.34,
        center[2] + Math.sin(angle) * rz * bump,
      ];
    });
    const top = [center[0] + rx * 0.14 * Math.sin(phase), center[1] + ry, center[2] + rz * 0.17 * Math.cos(phase)];
    const bottom = [center[0], center[1] - ry * 0.66, center[2]];
    const brightSide = Math.floor(wave(phase * 4.7) * sectors) % sectors;
    for (let index = 0; index < sectors; index++) {
      const next = (index + 1) % sectors;
      const a = rim[index];
      const b = rim[next];
      const offset = (index + brightSide) % sectors;
      const upperColor = [4, 5, 4, 3, 3, 2, 3][offset];
      addFace([a, b, top], palette[upperColor]);
      addFace([b, a, bottom], palette[offset % 3 === 1 ? 0 : 1]);
      if (offset === 0 || offset === 1 || offset === 5) {
        addEdge(mix(a, b, 0.14), mix(a, b, 0.82), palette[4]);
      }
      if (offset === 1 && accent) {
        const bend = mix(mix(a, b, 0.52), top, 0.60);
        addEdge(mix(mix(a, b, 0.27), top, 0.34), bend, "#a3c84a");
        if (accent === 2) addEdge(bend, mix(mix(a, b, 0.76), top, 0.47), lime);
      }
    }
  }

  function pad(center, spread, count, phase, skin, scale) {
    for (let index = 0; index < count; index++) {
      const angle = phase + index * 2.399963;
      const radius = Math.sqrt((index + 0.38) / count);
      const here = [
        center[0] + Math.cos(angle) * spread[0] * radius,
        center[1] + spread[1] * (0.40 - 0.45 * radius + 0.65 * Math.sin(index * 2.14 + phase)),
        center[2] + Math.sin(angle) * spread[2] * radius,
      ];
      const size = (0.80 + 0.36 * wave(index * 2.07 + phase)) * scale;
      const radii = [size * (1.05 + 0.24 * wave(index * 2.87)), size * 0.76, size * (0.96 + 0.22 * wave(angle * 5.15))];
      const palette = greens[(skin + (index % 5 === 0 ? 1 : 0)) % greens.length];
      tuft(here, radii, angle, palette, index % 13 === 1 ? 2 : (index % 6 === 0 ? 1 : 0));
    }
  }

  // The broadest growth sweeps to the lower left; the top crown banks right.
  pad([-4.48, 10.11, -2.57], [2.53, 0.93, 1.70], 19, 0.34, 0, 1.00);
  pad([-0.37, 11.47, 2.81], [2.04, 0.90, 1.30], 16, 0.61, 1, 1.03);
  pad([3.55, 13.22, -1.74], [2.65, 1.08, 1.61], 19, 0.28, 0, 1.07);
  pad([0.02, 14.22, -5.51], [1.52, 0.86, 1.03], 12, 0.53, 2, 0.95);
  pad([-3.10, 16.25, -2.86], [2.07, 0.95, 1.53], 16, 0.48, 0, 1.02);
  pad([1.34, 18.74, -2.45], [2.43, 1.34, 1.70], 19, 0.14, 1, 1.08);

  function vine(start, length, direction, phase) {
    const leafCount = 5;
    const at = (t) => [
      start[0] + Math.sin(t * 3.5 + phase) * t * 0.64 + direction[0] * t,
      start[1] - length * t,
      start[2] + Math.sin(t * 4.2 - phase) * t * 0.37 + direction[1] * t,
    ];
    for (let index = 0; index < leafCount; index++) {
      const base = at(index / leafCount);
      const next = at((index + 1) / leafCount);
      const side = index % 2 ? 1 : -1;
      const angle = phase + side * 1.25;
      const size = 0.99 - index * 0.095;
      const reach = [Math.cos(angle), -0.42, Math.sin(angle)];
      const across = [-Math.sin(angle), 0.38, Math.cos(angle)];
      const end = move(base, reach, size);
      const center = mix(base, end, 0.52);
      const right = move(center, across, size * 0.31);
      const left = move(center, across, -size * 0.31);
      const crease = move(center, [0, 1, 0], size * 0.17);
      addEdge(base, next, "#6d9436");
      addFace([base, right, crease], "#527b29");
      addFace([right, end, crease], "#779b3c");
      addFace([end, left, crease], "#588331");
      addFace([left, base, crease], "#385b1d");
      addEdge(right, end, index === 2 ? "#a6ca45" : "#83a73e");
    }
  }

  vine([-5.18, 10.10, -1.82], 2.71, [-0.23, 0.45], 0.10);
  vine([0.72, 11.48, 3.17], 3.30, [-0.37, 0.62], 1.48);
  vine([4.66, 13.2, -0.59], 2.83, [0.17, 0.53], 2.42);
}
