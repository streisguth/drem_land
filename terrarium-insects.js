const terrariumInsectFlights = [
  { center: [-4.7, 8.4, 3.75], reach: [1.55, 0.9, 1.3], speed: 0.81, phase: 0.35, bright: true },
  { center: [4.3, 11.7, 2.9], reach: [1.8, 1.15, 1.7], speed: -0.69, phase: 1.6, bright: true },
  { center: [2, 5.2, 5.1], reach: [2.1, 0.8, 1.3], speed: 0.94, phase: 2.8, bright: false },
  { center: [-5.8, 15.2, -0.8], reach: [1.45, 1.4, 2.2], speed: -0.52, phase: 4.2, bright: true },
  { center: [4.5, 18.2, -2.2], reach: [1.65, 1.05, 1.9], speed: 0.61, phase: 5.4, bright: false },
  { center: [-0.2, 7, -5.15], reach: [2, 1.1, 1.05], speed: -0.75, phase: 2.15, bright: true },
  { center: [0.4, 16.6, 3.2], reach: [2.3, 1.3, 1.7], speed: 0.66, phase: 3.1, bright: true },
];

function sampleTerrariumInsects(seconds, addEdge) {
  for (const [index, flight] of terrariumInsectFlights.entries()) {
    const { center, reach, speed, phase, bright } = flight;
    const orbit = phase + seconds * speed;
    const sin = Math.sin(orbit);
    const cos = Math.cos(orbit);
    const x = center[0] + reach[0] * cos;
    const y = center[1] + reach[1] * Math.sin(orbit * 1.43 + phase);
    const z = center[2] + reach[2] * sin;

    const movingX = -reach[0] * sin * speed;
    const movingZ = reach[2] * cos * speed;
    const speedAcross = Math.hypot(movingX, movingZ);
    const forwardX = movingX / speedAcross;
    const forwardZ = movingZ / speedAcross;

    const position = (along, side, lift = 0) => [
      x + forwardX * along - forwardZ * side,
      y + lift,
      z + forwardZ * along + forwardX * side,
    ];

    // A steady lime body and two flapping wings. The wings narrow at the top of each stroke.
    const wingBeat = Math.sin(seconds * (31 + 1.6 * index) + phase);
    const wingReach = 0.30 - 0.095 * Math.abs(wingBeat);
    const wingLift = 0.045 + 0.14 * wingBeat;
    const hinge = position(0.02, 0);
    const wingColor = bright ? "#8aaa2c" : "#63811f";

    addEdge(hinge, position(-0.09, -wingReach, wingLift), wingColor);
    addEdge(hinge, position(-0.09, wingReach, wingLift), wingColor);
    addEdge(position(-0.115, 0), position(0.125, 0), bright ? "#c7ff37" : "#a2c632");
  }
}
