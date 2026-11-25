function makeTerrariumVoxels() {
  const voxels = new Map();
  const lime = "#c7ff37";
  const moss = ["#465b1a", "#56751c", "#678b21", "#789e24"];
  const soil = ["#273115", "#344016", "#3c4b18"];
  const water = ["#202f13", "#283b15", "#354a18"];

  function put(x, y, z, color) {
    voxels.set(`${x},${y},${z}`, { x, y, z, color });
  }

  function shade(palette, x, z, salt = 0) {
    const grain = Math.abs((x * 71 + z * 29 + x * z * 37 + salt * 13) ^ (x * 11 - z * 23));
    return palette[grain % palette.length];
  }

  function isPond(x, z) {
    return Math.abs(x - 3) + Math.abs(z - 3) <= 2 && x >= 2;
  }

  function ground(x, z) {
    if (isPond(x, z)) return -2;

    const hill = 2 - Math.floor((Math.abs(x + 2) + Math.abs(z + 1)) / 2);
    const ridge = 1 - Math.floor((Math.abs(x - 4) + Math.abs(z + 4)) / 3);
    return Math.max(-1, hill, ridge);
  }

  // An exposed cross-section of soil sits beneath the moss and shallow pond.
  for (let x = -8; x <= 8; x += 1) {
    for (let z = -8; z <= 8; z += 1) {
      const corner = Math.abs(x) + Math.abs(z);
      if (corner > 11) continue;

      const surface = ground(x, z);
      const isRim = Math.max(Math.abs(x), Math.abs(z)) === 8 || corner > 10;
      for (let y = isRim ? -3 : -4; y < surface; y += 1) {
        const earth = y === -4 ? "#232b13" : shade(soil, x, z, y);
        put(x, y, z, earth);
      }
      put(x, surface, z, isPond(x, z) ? shade(water, x, z) : shade(moss, x, z));
    }
  }

  put(3, -2, 2, "#657d20");
  put(4, -2, 2, "#4d631c");
  put(2, -2, 4, "#465a17");

  // A taller fern anchors the silhouette, with staggered fronds in four directions.
  const fernX = -2;
  const fernZ = -1;
  for (let y = ground(fernX, fernZ) + 1; y <= 10; y += 1) {
    put(fernX, y, fernZ, y >= 8 ? "#a9dc2b" : "#80a928");
  }

  function frond(dx, dz, level, length, flip) {
    const curve = [0, 1, 1, 0, -1];
    for (let step = 1; step <= length; step += 1) {
      const x = fernX + dx * step;
      const y = level + curve[step - 1];
      const z = fernZ + dz * step;
      put(x, y, z, step === length ? lime : "#a6da2a");

      if (step > 1 && curve[step - 2] !== curve[step - 1]) {
        put(x, level + curve[step - 2], z, "#81a925");
      }

      if (step === length) continue;
      put(x - dz, y, z + dx, step === 2 ? lime : "#9dca29");
      put(x + dz, y, z - dx, "#7ea921");
      if (flip) put(x + dz, y - 1, z - dx, "#658a20");

      if (step === 2 && length > 3) {
        put(x - dz * 2, y, z + dx * 2, "#7da725");
      }
    }
  }

  frond(1, 0, 9, 4, 1);
  frond(0, -1, 8, 4, 0);
  frond(-1, 0, 7, 5, 0);
  frond(0, 1, 6, 4, 1);
  put(fernX, 11, fernZ, lime);

  function sprout(x, z, height, dx, dz) {
    const bed = ground(x, z);
    for (let step = 1; step <= height; step += 1) {
      put(x, bed + step, z, step === height ? "#b6ed32" : "#76a01e");
    }
    put(x + dx, bed + height - 1, z + dz, "#92be29");
    put(x + dx, bed + height, z + dz, "#92be29");
    put(x + dx * 2, bed + height, z + dz * 2, lime);
    put(x - dx, bed + 1, z - dz, "#629021");
  }

  sprout(4, -4, 3, 1, 0);
  sprout(5, -1, 2, 0, 1);
  sprout(0, -5, 3, 1, 0);
  sprout(-5, 3, 3, 0, 1);
  sprout(-4, 5, 2, 1, 0);
  sprout(1, 6, 2, 1, 0);

  for (const [x, z] of [[-5, -4], [-6, -3], [-3, 4], [4, 5], [6, 0], [2, -5]]) {
    put(x, ground(x, z) + 1, z, "#7d9e24");
  }

  // Two compact stone clusters give the foliage a contrasting mass.
  for (const [x, z] of [[-6, 0], [-5, 0], [-6, 1], [5, 3], [6, 3], [5, 4]]) {
    put(x, ground(x, z) + 1, z, "#6c7937");
  }
  put(-6, ground(-6, 0) + 2, 0, "#88954b");
  put(5, ground(5, 3) + 2, 3, "#7b8c43");

  return [...voxels.values()];
}
