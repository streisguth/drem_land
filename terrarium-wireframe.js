(() => {
  const canvas = document.getElementById("terrarium");
  const control = document.getElementById("terrarium-control");
  const poster = document.getElementById("terrarium-poster");
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas;
  const frame = context.createImageData(width, height);
  const surfaceDepth = new Float32Array(width * height);
  const wireDepth = new Float32Array(width * height);
  const vertices = [];
  const triangles = [];
  const edges = [];
  const vertexIndices = new Map();
  const palette = new Map();

  function vertex(point) {
    const key = point.join(",");
    if (!vertexIndices.has(key)) {
      vertexIndices.set(key, vertices.length);
      vertices.push(point);
    }
    return vertexIndices.get(key);
  }

  function rgb(color) {
    if (!palette.has(color)) {
      const value = parseInt(color.slice(1), 16);
      palette.set(color, [(value >> 16) & 255, (value >> 8) & 255, value & 255]);
    }
    return palette.get(color);
  }

  function addFace(points, color, outline) {
    const ids = points.map(vertex);
    const paint = rgb(color);
    for (let i = 1; i < ids.length - 1; i++) {
      triangles.push({ a: ids[0], b: ids[i], c: ids[i + 1], paint });
    }
    if (outline) {
      const ink = rgb(outline);
      for (let i = 0; i < ids.length; i++) {
        edges.push({ a: ids[i], b: ids[(i + 1) % ids.length], ink, weight: 1 });
      }
    }
  }

  function addEdge(start, end, color, weight = 1) {
    edges.push({ a: vertex(start), b: vertex(end), ink: rgb(color), weight });
  }

  const scene = { addFace, addEdge };
  makeTerrariumFrame(scene);
  makeTerrariumTerrain(scene);
  makeTerrariumWaterfall(scene);
  makeTerrariumFoliage(scene);
  makeTerrariumUndergrowth(scene);

  const pitch = 0.34;
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);
  const zoom = 7.35;
  const fullTurn = 2 * Math.PI;

  function cameraProjector(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return ([x, y, z]) => {
      const depth = x * sin + z * cos;
      const rise = y - 11.55;
      return [
        width / 2 + (x * cos - z * sin) * zoom,
        height / 2 - (rise * cosPitch - depth * sinPitch) * zoom,
        depth * cosPitch + rise * sinPitch,
      ];
    };
  }

  function paintPixel(index, color) {
    const offset = index * 4;
    frame.data[offset] = color[0];
    frame.data[offset + 1] = color[1];
    frame.data[offset + 2] = color[2];
    frame.data[offset + 3] = 255;
  }

  function fillTriangle([ax, ay, az], [bx, by, bz], [cx, cy, cz], color) {
    const abX = bx - ax;
    const abY = by - ay;
    const acX = cx - ax;
    const acY = cy - ay;
    const area = abX * acY - abY * acX;
    if (Math.abs(area) < 0.0001) return;

    const startX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const endX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
    const startY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const endY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
    const depthAB = bz - az;
    const depthAC = cz - az;
    const stepAB = acY / area;
    const stepAC = -abY / area;

    for (let y = startY; y <= endY; y++) {
      const sy = y + 0.5 - ay;
      const sx = startX + 0.5 - ax;
      let alongAB = (sx * acY - sy * acX) / area;
      let alongAC = (abX * sy - abY * sx) / area;
      let index = y * width + startX;

      for (let x = startX; x <= endX; x++, index++, alongAB += stepAB, alongAC += stepAC) {
        if (alongAB < 0 || alongAC < 0 || alongAB + alongAC > 1) continue;
        const depth = az + alongAB * depthAB + alongAC * depthAC;
        if (depth <= surfaceDepth[index]) continue;

        // Black faces are full-opacity pixels and also write the nearest surface depth.
        surfaceDepth[index] = depth;
        paintPixel(index, color);
      }
    }
  }

  function drawEdge([ax, ay, az], [bx, by, bz], color, weight) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const bias = 0.18;
    const firstOffset = -Math.floor((weight - 1) / 2);
    const endOffset = firstOffset + weight;

    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const pixelX = Math.floor(ax + dx * t);
      const pixelY = Math.floor(ay + dy * t);
      const depth = az + dz * t;

      for (let oy = firstOffset; oy < endOffset; oy++) {
        const y = pixelY + oy;
        if (y < 0 || y >= height) continue;
        for (let ox = firstOffset; ox < endOffset; ox++) {
          const x = pixelX + ox;
          if (x < 0 || x >= width) continue;
          const index = y * width + x;
          if (depth + bias < surfaceDepth[index] || depth < wireDepth[index]) continue;
          wireDepth[index] = depth;
          paintPixel(index, color);
        }
      }
    }
  }

  function draw(angle, seconds) {
    frame.data.fill(0);
    surfaceDepth.fill(-Infinity);
    wireDepth.fill(-Infinity);
    const project = cameraProjector(angle);
    const projected = vertices.map(project);

    for (const { a, b, c, paint } of triangles) {
      fillTriangle(projected[a], projected[b], projected[c], paint);
    }
    for (const { a, b, ink, weight } of edges) {
      drawEdge(projected[a], projected[b], ink, weight);
    }
    const drawWorldEdge = (start, end, tone, weight = 1) => {
      drawEdge(project(start), project(end), rgb(tone), weight);
    };
    sampleTerrariumGlass(angle, drawWorldEdge);
    sampleTerrariumWaterfall(seconds, drawWorldEdge);
    sampleTerrariumInsects(seconds, drawWorldEdge);
    context.putImageData(frame, 0, 0);
  }

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let angle = 0.12;
  let seconds = 0;
  let lastFrame = null;
  let request = null;

  function animate(time) {
    if (lastFrame === null) lastFrame = time;
    const elapsed = time - lastFrame;
    if (elapsed >= 32) {
      const step = Math.min(elapsed, 100) / 1000;
      angle = (angle + step * fullTurn / 26) % fullTurn;
      seconds += step;
      draw(angle, seconds);
      lastFrame = time;
    }
    request = requestAnimationFrame(animate);
  }

  function setPlaying(playing) {
    if (request !== null) cancelAnimationFrame(request);
    lastFrame = null;
    request = playing ? requestAnimationFrame(animate) : null;
    const label = playing ? "Pause terrarium animation" : "Play terrarium animation";
    control.setAttribute("aria-label", label);
    control.title = label;
  }

  draw(angle, seconds);
  poster.hidden = true;
  control.hidden = false;
  setPlaying(!motion.matches);
  control.addEventListener("click", () => setPlaying(request === null));

  const onMotionChange = (event) => setPlaying(!event.matches);
  if (typeof motion.addEventListener === "function") {
    motion.addEventListener("change", onMotionChange);
  } else if (typeof motion.addListener === "function") {
    motion.addListener(onMotionChange);
  }
})();
