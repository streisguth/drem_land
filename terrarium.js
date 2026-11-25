(() => {
  const canvas = document.getElementById("terrarium");
  const control = document.getElementById("terrarium-control");
  const context = canvas.getContext("2d");

  if (!context) {
    control.hidden = true;
    return;
  }

  const faces = [
    { normal: [1, 0, 0], corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
    { normal: [-1, 0, 0], corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
    { normal: [0, 1, 0], corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
    { normal: [0, -1, 0], corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
    { normal: [0, 0, 1], corners: [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]] },
    { normal: [0, 0, -1], corners: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] },
  ];

  function createMesh(voxels) {
    const vertices = [];
    const surfaces = [];
    const vertexIndices = new Map();
    const occupied = new Set(voxels.map(({ x, y, z }) => `${x},${y},${z}`));

    for (const { x, y, z, color } of voxels) {
      faces.forEach(({ normal: [nx, ny, nz], corners }, side) => {
        if (occupied.has(`${x + nx},${y + ny},${z + nz}`)) return;

        const indices = corners.map(([dx, dy, dz]) => {
          const point = [x + dx / 2, y + dy / 2, z + dz / 2];
          const key = point.join(",");
          if (!vertexIndices.has(key)) {
            vertexIndices.set(key, vertices.length);
            vertices.push(point);
          }
          return vertexIndices.get(key);
        });
        surfaces.push({ indices, side, color });
      });
    }
    return { vertices, surfaces };
  }

  const mesh = createMesh(makeTerrariumVoxels());
  const octagon = [[-7, -10], [7, -10], [10, -7], [10, 7], [7, 10], [-7, 10], [-10, 7], [-10, -7]];
  const rings = [
    [-4.15, 0.97], [-3.0, 1], [10.25, 1], [14.0, 0.57], [15.2, 0.57],
  ].map(([y, scale]) => octagon.map(([x, z]) => [x * scale, y, z * scale]));
  const paneNormals = octagon.map(([x, z], index) => {
    const [nextX, nextZ] = octagon[(index + 1) % octagon.length];
    const dx = nextX - x;
    const dz = nextZ - z;
    const length = Math.hypot(dx, dz);
    return [dz / length, -dx / length];
  });

  const lime = getComputedStyle(canvas).getPropertyValue("--lime").trim();
  const rgb = (hex) => hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
  const glass = (opacity) => `rgba(${rgb(lime).join(",")},${opacity})`;
  const pitch = 0.43;
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);
  const scale = 5.25;

  function cameraAt(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const project = ([x, y, z]) => {
      const depth = x * sin + z * cos;
      const vertical = y - 4.75;
      return [
        canvas.width / 2 + (x * cos - z * sin) * scale,
        canvas.height / 2 - (vertical * cosPitch - depth * sinPitch) * scale,
        depth * cosPitch + vertical * sinPitch,
      ];
    };
    return { cos, sin, project };
  }

  function polygon(points, color, sealEdges = false) {
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = color;
    context.fill();

    // A subpixel stroke seals the antialiasing gaps between adjacent voxels.
    if (sealEdges) {
      context.strokeStyle = color;
      context.lineWidth = 0.65;
      context.stroke();
    }
  }

  function pixelLine(start, end, color) {
    let x = Math.round(start[0]);
    let y = Math.round(start[1]);
    const endX = Math.round(end[0]);
    const endY = Math.round(end[1]);
    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const stepX = x < endX ? 1 : -1;
    const stepY = y < endY ? 1 : -1;
    let error = dx + dy;
    context.fillStyle = color;

    while (true) {
      context.fillRect(x, y, 1, 1);
      if (x === endX && y === endY) break;
      const twiceError = error * 2;
      if (twiceError >= dy) { error += dy; x += stepX; }
      if (twiceError <= dx) { error += dx; y += stepY; }
    }
  }

  function panePoint(index, fraction, y) {
    const [x, z] = octagon[index];
    const [nextX, nextZ] = octagon[(index + 1) % octagon.length];
    return [x + (nextX - x) * fraction, y, z + (nextZ - z) * fraction];
  }

  function drawGlass(projectedRings, camera, front) {
    const facings = paneNormals.map(([x, z]) => x * camera.sin + z * camera.cos);
    const rimOpacities = front ? [0.39, 0.79, 0.38, 0.5, 0.9] : [0.13, 0.2, 0.28, 0.3, 0.55];
    const rimColors = rimOpacities.map(glass);
    const creaseColor = glass(front ? 0.36 : 0.15);
    const roofColor = glass(front ? 0.38 : 0.19);

    for (let index = 0; index < octagon.length; index++) {
      const next = (index + 1) % octagon.length;
      const previous = (index + octagon.length - 1) % octagon.length;
      const facing = facings[index];

      if ((facing > 0) === front) {
        if (front) {
          polygon([
            projectedRings[1][index], projectedRings[1][next],
            projectedRings[2][next], projectedRings[2][index],
          ], glass(0.017 + facing * 0.019));
          polygon([
            projectedRings[2][index], projectedRings[2][next],
            projectedRings[3][next], projectedRings[3][index],
          ], glass(0.033));

          const facingLight = Math.max(0, -paneNormals[index][0] * camera.cos + paneNormals[index][1] * camera.sin);
          if (facingLight > 0.35 && facing > 0.24) {
            const streak = (fraction, top, bottom, strength) => {
              pixelLine(
                camera.project(panePoint(index, fraction, top)),
                camera.project(panePoint(index, fraction, bottom)),
                glass(strength * facing * facingLight),
              );
            };
            streak(0.71, 8.75, 4.3, 0.62);
            streak(0.84, 8.1, 6.55, 0.32);
          }
        }
        projectedRings.forEach((ring, level) => pixelLine(ring[index], ring[next], rimColors[level]));
      }

      if ((Math.max(facing, facings[previous]) > 0) === front) {
        pixelLine(projectedRings[0][index], projectedRings[2][index], creaseColor);
        pixelLine(projectedRings[2][index], projectedRings[3][index], roofColor);
        pixelLine(projectedRings[3][index], projectedRings[4][index], creaseColor);
      }
    }
  }

  function drawVoxels(camera) {
    const points = mesh.vertices.map(camera.project);
    const sides = faces.map(({ normal: [nx, ny, nz] }) => {
      const horizontal = nx * camera.cos - nz * camera.sin;
      const depth = nx * camera.sin + nz * camera.cos;
      return {
        visible: depth * cosPitch + ny * sinPitch > 0.0001,
        light: ny > 0 ? 1 : 0.63 + Math.max(0, -horizontal) * 0.23 + depth * 0.08,
        palette: new Map(),
      };
    });

    const visible = [];
    for (const surface of mesh.surfaces) {
      if (!sides[surface.side].visible) continue;
      const corners = surface.indices.map((index) => points[index]);
      const depth = corners.reduce((total, point) => total + point[2], 0);
      visible.push({ corners, surface, depth });
    }
    visible.sort((a, b) => a.depth - b.depth);

    for (const { corners, surface } of visible) {
      const { palette, light } = sides[surface.side];
      const { color } = surface;
      if (!palette.has(color)) {
        palette.set(color, `rgb(${rgb(color).map((value) => Math.round(value * light)).join(",")})`);
      }
      polygon(corners, palette.get(color), true);
    }
  }

  function drawShadow() {
    context.save();
    context.translate(canvas.width / 2, 142);
    context.scale(1, 0.23);
    const shadow = context.createRadialGradient(0, 0, 7, 0, 0, 68);
    shadow.addColorStop(0, glass(0.13));
    shadow.addColorStop(0.75, glass(0.04));
    shadow.addColorStop(1, glass(0));
    context.fillStyle = shadow;
    context.fillRect(-68, -68, 136, 136);
    context.restore();
  }

  function render(angle) {
    const camera = cameraAt(angle);
    const projectedRings = rings.map((ring) => ring.map(camera.project));
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawShadow();
    drawGlass(projectedRings, camera, false);
    drawVoxels(camera);
    drawGlass(projectedRings, camera, true);
  }

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fullTurn = Math.PI * 2;
  let angle = 0.58;
  let lastRender = null;
  let frame = null;

  function animate(time) {
    if (lastRender === null) lastRender = time;
    const elapsed = time - lastRender;
    if (elapsed >= 1000 / 30) {
      angle = (angle + Math.min(elapsed, 100) * fullTurn / 22000) % fullTurn;
      render(angle);
      lastRender = time;
    }
    frame = requestAnimationFrame(animate);
  }

  function setPlaying(playing) {
    if (frame !== null) cancelAnimationFrame(frame);
    lastRender = null;
    frame = playing ? requestAnimationFrame(animate) : null;
    const label = playing ? "Pause terrarium rotation" : "Play terrarium rotation";
    control.setAttribute("aria-label", label);
    control.title = label;
  }

  render(angle);
  setPlaying(!motion.matches);
  control.addEventListener("click", () => setPlaying(frame === null));
  motion.addEventListener("change", (event) => setPlaying(!event.matches));
})();
