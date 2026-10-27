"use strict";

const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "..", "model", "ruang-bakar-3d.glb");
const binaryParts = [];
let binaryLength = 0;
const bufferViews = [];
const accessors = [];
const meshes = [];

function align(value, boundary) {
  return Math.ceil(value / boundary) * boundary;
}

function addAccessor(values, componentType, type, target, bounds) {
  const array = componentType === 5125
    ? Uint32Array.from(values)
    : Float32Array.from(values);
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const start = align(binaryLength, 4);
  if (start > binaryLength) {
    binaryParts.push(Buffer.alloc(start - binaryLength));
    binaryLength = start;
  }
  binaryParts.push(bytes);
  const bufferView = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset: start, byteLength: bytes.length, target });
  binaryLength += bytes.length;
  const componentCount = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
  const accessor = {
    bufferView,
    componentType,
    count: values.length / componentCount,
    type
  };
  if (bounds) {
    accessor.min = bounds.min;
    accessor.max = bounds.max;
  }
  accessors.push(accessor);
  return accessors.length - 1;
}

function bounds3(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < vertices.length; index += 3) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], vertices[index + axis]);
      max[axis] = Math.max(max[axis], vertices[index + axis]);
    }
  }
  return { min, max };
}

function mesh(name, positions, normals, indices, material) {
  const position = addAccessor(positions, 5126, "VEC3", 34962, bounds3(positions));
  const normal = addAccessor(normals, 5126, "VEC3", 34962);
  const index = addAccessor(indices, 5125, "SCALAR", 34963);
  meshes.push({
    name,
    primitives: [{
      attributes: { POSITION: position, NORMAL: normal },
      indices: index,
      material
    }]
  });
  return meshes.length - 1;
}

function makeLathe(name, radius, bottom, top, material, options = {}) {
  const positions = [], normals = [], indices = [];
  const segments = options.segments || 48;
  const start = options.start === undefined ? 0 : options.start;
  const end = options.end === undefined ? Math.PI * 2 : options.end;
  const inner = options.inner || 0;
  const count = segments + 1;

  for (let index = 0; index < count; index++) {
    const angle = start + (end - start) * index / segments;
    const x = Math.cos(angle), z = Math.sin(angle);
    positions.push(x * radius, bottom, z * radius, x * radius, top, z * radius);
    normals.push(x, 0, z, x, 0, z);
    if (inner > 0) {
      positions.push(x * inner, bottom, z * inner, x * inner, top, z * inner);
      normals.push(-x, 0, -z, -x, 0, -z);
    }
  }

  for (let segment = 0; segment < segments; segment++) {
    const outerBase = segment * (inner > 0 ? 4 : 2);
    const outerNext = outerBase + (inner > 0 ? 4 : 2);
    indices.push(outerBase, outerBase + 1, outerNext, outerBase + 1, outerNext + 1, outerNext);
    if (inner > 0) {
      const innerBase = outerBase + 2, innerNext = outerNext + 2;
      indices.push(innerBase, innerNext, innerBase + 1, innerBase + 1, innerNext, innerNext + 1);
    }
  }
  if (options.caps && inner === 0) {
    const lowerCenter = positions.length / 3;
    positions.push(0, bottom, 0);
    normals.push(0, -1, 0);
    const upperCenter = positions.length / 3;
    positions.push(0, top, 0);
    normals.push(0, 1, 0);
    for (let segment = 0; segment < segments; segment++) {
      const current = segment * 2;
      const next = current + 2;
      indices.push(lowerCenter, current, next, upperCenter, next + 1, current + 1);
    }
  }
  return mesh(name, positions, normals, indices, material);
}

function makeBox(name, half, material) {
  const positions = [], normals = [], indices = [];
  const faces = [
    { normal: [1, 0, 0], corners: [[half[0], -half[1], -half[2]], [half[0], half[1], -half[2]], [half[0], half[1], half[2]], [half[0], -half[1], half[2]]] },
    { normal: [-1, 0, 0], corners: [[-half[0], -half[1], half[2]], [-half[0], half[1], half[2]], [-half[0], half[1], -half[2]], [-half[0], -half[1], -half[2]]] },
    { normal: [0, 1, 0], corners: [[-half[0], half[1], -half[2]], [-half[0], half[1], half[2]], [half[0], half[1], half[2]], [half[0], half[1], -half[2]]] },
    { normal: [0, -1, 0], corners: [[-half[0], -half[1], half[2]], [-half[0], -half[1], -half[2]], [half[0], -half[1], -half[2]], [half[0], -half[1], half[2]]] },
    { normal: [0, 0, 1], corners: [[-half[0], -half[1], half[2]], [half[0], -half[1], half[2]], [half[0], half[1], half[2]], [-half[0], half[1], half[2]]] },
    { normal: [0, 0, -1], corners: [[half[0], -half[1], -half[2]], [-half[0], -half[1], -half[2]], [-half[0], half[1], -half[2]], [half[0], half[1], -half[2]]] }
  ];
  for (const face of faces) {
    const first = positions.length / 3;
    for (const point of face.corners) {
      positions.push(...point);
      normals.push(...face.normal);
    }
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  return mesh(name, positions, normals, indices, material);
}

function makeExtrudedPolygon(name, outline, depth, material) {
  const positions = [], normals = [], indices = [];
  const count = outline.length;
  for (const z of [-depth / 2, depth / 2]) {
    for (const [x, y] of outline) {
      positions.push(x, y, z);
      normals.push(0, 0, z < 0 ? -1 : 1);
    }
  }
  for (let index = 1; index < count - 1; index++) {
    indices.push(0, index + 1, index, count, count + index, count + index + 1);
  }
  for (let index = 0; index < count; index++) {
    const next = (index + 1) % count;
    const first = positions.length / 3;
    const [x1, y1] = outline[index], [x2, y2] = outline[next];
    const dx = x2 - x1, dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const normal = [dy / length, -dx / length, 0];
    positions.push(x1, y1, -depth / 2, x2, y2, -depth / 2, x2, y2, depth / 2, x1, y1, depth / 2);
    for (let corner = 0; corner < 4; corner++) normals.push(...normal);
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  return mesh(name, positions, normals, indices, material);
}

function makeLinkRod(length, material) {
  const outline = [];
  const radius = 0.09;
  const steps = 12;
  for (let index = 0; index <= steps; index++) {
    const angle = index * Math.PI / steps;
    outline.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  for (let index = 0; index <= steps; index++) {
    const angle = Math.PI + index * Math.PI / steps;
    outline.push([Math.cos(angle) * radius * 1.25, -length + Math.sin(angle) * radius * 1.25]);
  }
  return makeExtrudedPolygon("Batang penghubung", outline, 0.12, material);
}

function makeGear(name, radius, thickness, toothCount, material) {
  const outline = [];
  for (let tooth = 0; tooth < toothCount; tooth++) {
    const start = tooth * Math.PI * 2 / toothCount;
    for (const [fraction, scale] of [[0, 0.91], [0.18, 0.91], [0.24, 1], [0.72, 1], [0.78, 0.91]]) {
      const angle = start + fraction * Math.PI * 2 / toothCount;
      outline.push([Math.cos(angle) * radius * scale, Math.sin(angle) * radius * scale]);
    }
  }
  return makeExtrudedPolygon(name, outline, thickness, material);
}

function makeShaft(name, radius, length, material, segments = 32) {
  const positions = [], normals = [], indices = [];
  for (let index = 0; index <= segments; index++) {
    const angle = index * Math.PI * 2 / segments;
    const x = Math.cos(angle), y = Math.sin(angle);
    positions.push(x * radius, y * radius, -length / 2, x * radius, y * radius, length / 2);
    normals.push(x, y, 0, x, y, 0);
  }
  for (let index = 0; index < segments; index++) {
    const current = index * 2;
    const next = current + 2;
    indices.push(current, next, current + 1, current + 1, next, next + 1);
  }
  return mesh(name, positions, normals, indices, material);
}

function makeSphere(name, radius, material, segments = 16, rings = 10) {
  const positions = [], normals = [], indices = [];
  for (let ring = 0; ring <= rings; ring++) {
    const latitude = Math.PI * ring / rings;
    const y = Math.cos(latitude);
    const ringRadius = Math.sin(latitude);
    for (let segment = 0; segment <= segments; segment++) {
      const longitude = Math.PI * 2 * segment / segments;
      const x = ringRadius * Math.cos(longitude);
      const z = ringRadius * Math.sin(longitude);
      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }
  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const current = ring * (segments + 1) + segment;
      const next = current + segments + 1;
      indices.push(current, current + 1, next, current + 1, next + 1, next);
    }
  }
  return mesh(name, positions, normals, indices, material);
}

const materials = [
  { name: "Bodi aluminium biru kelabu", pbrMetallicRoughness: { baseColorFactor: [0.24, 0.39, 0.47, 1], metallicFactor: 0.62, roughnessFactor: 0.36 } },
  { name: "Piston aluminium", pbrMetallicRoughness: { baseColorFactor: [0.78, 0.82, 0.83, 1], metallicFactor: 0.82, roughnessFactor: 0.24 } },
  { name: "Baja gelap", pbrMetallicRoughness: { baseColorFactor: [0.17, 0.22, 0.27, 1], metallicFactor: 0.82, roughnessFactor: 0.31 } },
  { name: "Engkol baja tembaga", pbrMetallicRoughness: { baseColorFactor: [0.85, 0.34, 0.16, 1], metallicFactor: 0.72, roughnessFactor: 0.3 } },
  { name: "Busi keramik", pbrMetallicRoughness: { baseColorFactor: [0.82, 0.84, 0.81, 1], metallicFactor: 0.22, roughnessFactor: 0.32 } },
  { name: "Campuran udara dan bahan bakar", pbrMetallicRoughness: { baseColorFactor: [0.12, 0.52, 1, 1], metallicFactor: 0.12, roughnessFactor: 0.3 } },
  { name: "Gas buang gelap", pbrMetallicRoughness: { baseColorFactor: [0.07, 0.08, 0.09, 1], metallicFactor: 0.02, roughnessFactor: 0.82 } },
  { name: "Nyala pembakaran", pbrMetallicRoughness: { baseColorFactor: [1, 0.24, 0.035, 1], metallicFactor: 0.05, roughnessFactor: 0.24 } },
  { name: "Inti pembakaran", pbrMetallicRoughness: { baseColorFactor: [1, 0.82, 0.2, 1], metallicFactor: 0.02, roughnessFactor: 0.2 } }
];

const crankCenterY = -0.66;
const crankRadius = 0.27;
const rodLength = 0.72;
const pistonPinY = crankCenterY + crankRadius + rodLength + 0.035;
const pistonNode = 0;
const rodNode = 5;
const crankNode = 6;
const crankPinNode = 7;
const gearNode = 9;
const intakeValveNode = 11;
const exhaustValveNode = 12;
const nodes = [
  { name: "Piston - komponen bergerak", mesh: makeLathe("Piston aluminium dengan alur ring", 0.34, -0.12, 0.13, 1, { segments: 48, caps: true }), translation: [0, pistonPinY, 0] },
  { name: "Ring piston atas", mesh: makeLathe("Ring kompresi", 0.35, 0.065, 0.082, 2, { segments: 48, inner: 0.335 }), translation: [0, pistonPinY, 0] },
  { name: "Ring piston bawah", mesh: makeLathe("Ring oli", 0.35, 0.025, 0.042, 2, { segments: 48, inner: 0.335 }), translation: [0, pistonPinY, 0] },
  { name: "Liner silinder potongan", mesh: makeLathe("Dinding silinder terbuka", 0.42, crankCenterY + 0.37, 0.73, 0, {
    segments: 72,
    start: Math.PI * 0.75,
    end: Math.PI * 2.25,
    inner: 0.37
  }) },
  { name: "Dudukan atas poros", mesh: makeBox("Dudukan atas poros", [0.61, 0.1, 0.43], 0), translation: [0, -0.34, 0] },
  { name: "Batang penghubung - bergerak", mesh: makeLinkRod(rodLength, 3), translation: [0, pistonPinY - 0.035, 0] },
  { name: "Lengan poros engkol - berputar", mesh: makeExtrudedPolygon("Web engkol", [
    [-0.13, -0.17], [0.13, -0.17], [0.12, crankRadius + 0.13],
    [-0.12, crankRadius + 0.13]
  ], 0.27, 3), translation: [0, crankCenterY, 0] },
  { name: "Pin engkol - orbit", mesh: makeShaft("Pin engkol", 0.105, 0.34, 3), translation: [0, crankCenterY + crankRadius, 0] },
  { name: "Poros utama", mesh: makeShaft("Poros utama", 0.105, 1.2, 2), translation: [0, crankCenterY, 0] },
  { name: "Roda gigi - berputar", mesh: makeGear("Roda gigi", 0.32, 0.13, 18, 3), translation: [-0.66, crankCenterY, 0.39] },
  { name: "Kepala silinder", mesh: makeBox("Kepala silinder", [0.53, 0.14, 0.42], 0), translation: [0, 0.76, 0] },
  { name: "Katup masuk - bergerak", mesh: makeLathe("Batang katup masuk", 0.035, -0.085, 0.43, 1, { segments: 20, caps: true }), translation: [-0.17, 0.68, 0.45] },
  { name: "Katup buang - bergerak", mesh: makeLathe("Batang katup buang", 0.035, -0.085, 0.43, 1, { segments: 20, caps: true }), translation: [0.17, 0.68, 0.45] },
  { name: "Busi", mesh: makeLathe("Busi", 0.065, 0, 0.36, 4, { segments: 20, caps: true }), translation: [0, 0.78, 0.12] },
  { name: "Bantalan poros", mesh: makeShaft("Bantalan poros", 0.17, 0.17, 2), translation: [0, crankCenterY, 0.48] },
  { name: "Rangka crankcase kiri", mesh: makeBox("Crankcase kiri", [0.09, 0.32, 0.43], 0), translation: [-0.52, -0.68, 0] },
  { name: "Rangka crankcase kanan", mesh: makeBox("Crankcase kanan", [0.09, 0.32, 0.43], 0), translation: [0.52, -0.68, 0] },
  { name: "Palang bawah crankcase", mesh: makeBox("Palang bawah", [0.61, 0.075, 0.43], 0), translation: [0, -1.0, 0] }
];
const intakeValveHeadNode = nodes.length;
nodes.push({
  name: "Piring katup masuk",
  mesh: makeLathe("Kepala katup masuk", 0.11, -0.105, -0.075, 1, { segments: 32, caps: true }),
  translation: [-0.17, 0.68, 0.45]
});
const exhaustValveHeadNode = nodes.length;
nodes.push({
  name: "Piring katup buang",
  mesh: makeLathe("Kepala katup buang", 0.1, -0.105, -0.075, 2, { segments: 32, caps: true }),
  translation: [0.17, 0.68, 0.45]
});
nodes.push({
  name: "Dudukan katup masuk",
  mesh: makeLathe("Cincin dudukan katup masuk", 0.135, -0.015, 0.015, 2, { segments: 32, inner: 0.105 }),
  translation: [-0.17, 0.615, 0.43]
});
nodes.push({
  name: "Dudukan katup buang",
  mesh: makeLathe("Cincin dudukan katup buang", 0.125, -0.015, 0.015, 2, { segments: 32, inner: 0.095 }),
  translation: [0.17, 0.615, 0.43]
});
const mixtureMesh = makeSphere("Partikel campuran segar", 0.045, 5, 12, 8);
const exhaustMesh = makeSphere("Partikel gas buang", 0.052, 6, 12, 8);
const flameMesh = makeSphere("Kilatan pembakaran", 0.085, 7, 18, 12);
const flameCoreMesh = makeSphere("Inti nyala", 0.045, 8, 16, 10);
const intakeGasNodes = Array.from({ length: 5 }, (_, index) => {
  const node = nodes.length;
  nodes.push({ name: `Campuran masuk ${index + 1}`, mesh: mixtureMesh, translation: [-0.17, 0.55, 0.12], scale: [0.001, 0.001, 0.001] });
  return node;
});
const exhaustGasNodes = Array.from({ length: 5 }, (_, index) => {
  const node = nodes.length;
  nodes.push({ name: `Gas bekas keluar ${index + 1}`, mesh: exhaustMesh, translation: [0.17, 0.5, 0.12], scale: [0.001, 0.001, 0.001] });
  return node;
});
const flameNode = nodes.length;
nodes.push({ name: "Efek ledakan pembakaran", mesh: flameMesh, translation: [0, 0.55, 0.11], scale: [0.001, 0.001, 0.001] });
const flameCoreNode = nodes.length;
nodes.push({ name: "Inti nyala pembakaran", mesh: flameCoreMesh, translation: [0, 0.55, 0.16], scale: [0.001, 0.001, 0.001] });

const channelSamplers = [];
const channels = [];
const timeCount = 49;
const duration = 8;
const times = Array.from({ length: timeCount }, (_, index) => duration * index / (timeCount - 1));
const timeAccessor = addAccessor(times, 5126, "SCALAR", 0, { min: [0], max: [duration] });

function addAnimationChannel(node, pathName, values, type) {
  const outputAccessor = addAccessor(values, 5126, type, 0);
  const sampler = channelSamplers.length;
  channelSamplers.push({ input: timeAccessor, output: outputAccessor, interpolation: "LINEAR" });
  channels.push({ sampler, target: { node, path: pathName } });
}

const pistonPositions = [], rodPositions = [], rodRotations = [];
const crankRotations = [], crankPinPositions = [], gearRotations = [];
const intakeValvePositions = [], exhaustValvePositions = [];
const mixtureTracks = intakeGasNodes.map(() => ({ positions: [], scales: [] }));
const exhaustTracks = exhaustGasNodes.map(() => ({ positions: [], scales: [] }));
const flameScales = [], flameCoreScales = [];
for (let index = 0; index < timeCount; index++) {
  const angle = index / (timeCount - 1) * Math.PI * 4;
  const crankAngle = angle % (Math.PI * 2);
  const displacement = crankRadius * (1 - Math.cos(crankAngle)) +
    rodLength - Math.sqrt(Math.max(0, rodLength * rodLength - crankRadius * crankRadius * Math.sin(crankAngle) ** 2));
  const pistonY = pistonPinY - displacement;
  const pinX = crankRadius * Math.sin(crankAngle);
  const pinY = crankCenterY + crankRadius * Math.cos(crankAngle);
  const rodTopY = pistonY - 0.035;
  const dx = pinX;
  const dy = pinY - rodTopY;
  const rodAngle = Math.atan2(dx, -dy);
  const intakeLift = angle <= Math.PI ? Math.sin(angle) * 0.065 : 0;
  const exhaustLift = angle >= Math.PI * 3 ? Math.sin(angle - Math.PI * 3) * 0.065 : 0;

  pistonPositions.push(0, pistonY, 0);
  rodPositions.push(0, rodTopY, 0);
  rodRotations.push(0, 0, Math.sin(rodAngle / 2), Math.cos(rodAngle / 2));
  crankRotations.push(0, 0, Math.sin(-angle / 2), Math.cos(angle / 2));
  crankPinPositions.push(pinX, pinY, 0);
  gearRotations.push(0, 0, Math.sin(-angle / 2), Math.cos(angle / 2));
  intakeValvePositions.push(-0.17, 0.68 - intakeLift, 0.45);
  exhaustValvePositions.push(0.17, 0.68 - exhaustLift, 0.45);

  mixtureTracks.forEach((track, particle) => {
    const arrival = Math.max(0, Math.min(1, angle / Math.PI / 0.68 - particle * 0.08));
    const spreadX = (particle - 2) * 0.105;
    const spreadFraction = [0.28, 0.68, 0.43, 0.78, 0.55][particle];
    const spreadY = pistonY + 0.13 + (0.62 - pistonY - 0.13) * spreadFraction;
    const blend = Math.min(1, arrival * 3);
    const fadeAfterIgnition = Math.max(0, Math.min(1, 1 - (angle - Math.PI * 2) / (Math.PI * 0.18)));
    const visible = blend * fadeAfterIgnition;
    track.positions.push(
      -0.17 + (spreadX + 0.17) * arrival,
      0.67 + (spreadY - 0.67) * arrival,
      0.2
    );
    track.scales.push(visible * 0.82 + 0.001, visible * 0.82 + 0.001, visible * 0.82 + 0.001);
  });
  exhaustTracks.forEach((track, particle) => {
    const spreadX = (particle - 2) * 0.105;
    const spreadFraction = [0.28, 0.68, 0.43, 0.78, 0.55][particle];
    const spreadY = pistonY + 0.13 + (0.62 - pistonY - 0.13) * spreadFraction;
    const exhaustProgress = angle < Math.PI * 3 ? 0 : (angle - Math.PI * 3) / Math.PI;
    const route = Math.max(0, Math.min(1, (exhaustProgress - particle * 0.055) / 0.72));
    const valveProgress = Math.min(1, route * 2);
    const exitProgress = Math.max(0, route * 2 - 1);
    const valveX = spreadX + (0.17 - spreadX) * valveProgress;
    const valveY = spreadY + (0.57 - spreadY) * valveProgress;
    const valveZ = 0.2 + (0.46 - 0.2) * valveProgress;
    const x = valveX + (0.17 - valveX) * exitProgress;
    const y = valveY + (0.82 - valveY) * exitProgress;
    const z = valveZ + (0.54 - valveZ) * exitProgress;
    const appear = Math.max(0, Math.min(1, (angle - Math.PI * 2) / (Math.PI * 0.18)));
    const leave = 1 - Math.max(0, Math.min(1, (route - 0.88) / 0.12));
    const visible = appear * leave;
    track.positions.push(x, y, z);
    track.scales.push(visible * 0.9 + 0.001, visible * 0.9 + 0.001, visible * 0.9 + 0.001);
  });
  const burn = angle >= Math.PI * 2 && angle <= Math.PI * 3
    ? Math.max(0, Math.sin((angle - Math.PI * 2) / Math.PI * Math.PI))
    : 0;
  const flameScale = burn * 1.12 + 0.001;
  const coreScale = burn * 0.72 + 0.001;
  flameScales.push(flameScale, flameScale, flameScale);
  flameCoreScales.push(coreScale, coreScale, coreScale);
}

addAnimationChannel(pistonNode, "translation", pistonPositions, "VEC3");
addAnimationChannel(1, "translation", pistonPositions, "VEC3");
addAnimationChannel(2, "translation", pistonPositions, "VEC3");
addAnimationChannel(rodNode, "translation", rodPositions, "VEC3");
addAnimationChannel(rodNode, "rotation", rodRotations, "VEC4");
addAnimationChannel(crankNode, "rotation", crankRotations, "VEC4");
addAnimationChannel(crankPinNode, "translation", crankPinPositions, "VEC3");
addAnimationChannel(gearNode, "rotation", gearRotations, "VEC4");
addAnimationChannel(intakeValveNode, "translation", intakeValvePositions, "VEC3");
addAnimationChannel(exhaustValveNode, "translation", exhaustValvePositions, "VEC3");
addAnimationChannel(intakeValveHeadNode, "translation", intakeValvePositions, "VEC3");
addAnimationChannel(exhaustValveHeadNode, "translation", exhaustValvePositions, "VEC3");
intakeGasNodes.forEach((node, index) => {
  addAnimationChannel(node, "translation", mixtureTracks[index].positions, "VEC3");
  addAnimationChannel(node, "scale", mixtureTracks[index].scales, "VEC3");
});
exhaustGasNodes.forEach((node, index) => {
  addAnimationChannel(node, "translation", exhaustTracks[index].positions, "VEC3");
  addAnimationChannel(node, "scale", exhaustTracks[index].scales, "VEC3");
});
addAnimationChannel(flameNode, "scale", flameScales, "VEC3");
addAnimationChannel(flameCoreNode, "scale", flameCoreScales, "VEC3");

const binary = Buffer.concat(binaryParts);
const json = {
  asset: { version: "2.0", generator: "Simulasi Ruang Bakar 3D - model komponen animasi" },
  scene: 0,
  scenes: [{ name: "Mesin satu silinder potongan", nodes: nodes.map((_, index) => index) }],
  nodes,
  meshes,
  materials,
  animations: [{
    name: "Siklus Mekanisme",
    extras: { loop: true, cycleDurationSeconds: duration, description: "Gerak mesin empat langkah, campuran masuk, pembakaran, dan gas buang." },
    samplers: channelSamplers,
    channels
  }],
  accessors,
  bufferViews,
  buffers: [{ byteLength: binary.length }]
};

const jsonChunk = Buffer.from(JSON.stringify(json));
const paddedJsonLength = align(jsonChunk.length, 4);
const paddedBinaryLength = align(binary.length, 4);
const glb = Buffer.alloc(12 + 8 + paddedJsonLength + 8 + paddedBinaryLength);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(paddedJsonLength, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
glbChunk(jsonChunk, glb, 20, paddedJsonLength, 0x20);
const binaryHeader = 20 + paddedJsonLength;
glb.writeUInt32LE(paddedBinaryLength, binaryHeader);
glb.writeUInt32LE(0x004e4942, binaryHeader + 4);
binary.copy(glb, binaryHeader + 8);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, glb);
console.log(`Generated ${outputPath} (${glb.length} bytes)`);
console.log(`Separate moving/static parts: ${nodes.length}; animation channels: ${channels.length}; duration: ${duration} seconds`);

function glbChunk(source, destination, offset, paddedLength, paddingByte) {
  destination.fill(paddingByte, offset, offset + paddedLength);
  source.copy(destination, offset);
}
