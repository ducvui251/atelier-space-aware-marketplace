/**
 * Builds a minimal glTF 2.0 asset for a single artwork: a thin real-scale
 * box (metres, matching the artwork's actual widthCm/heightCm) — the front
 * face textured with the artwork's own image, the back and four side edges
 * a plain canvas-colored material. That's what "View in AR" needs (see the
 * "View in AR" flow): the box's real-world size is what lets an AR session
 * drop it onto the buyer's wall at true scale.
 *
 * A flat single quad (2 triangles, zero depth) was tried first and relied
 * on the material's `doubleSided` flag to show anything when viewed from
 * behind. Confirmed on a real device: iOS Quick Look's "Object" viewer does
 * not reliably honor that flag on a zero-thickness mesh — rotating past
 * roughly a 90° angle renders the back as a blank white plane instead of
 * the (even mirrored) texture. Giving the box real depth means every face
 * is explicit geometry with its own normal, so there's no back-face
 * rendering left to the renderer's discretion — it also happens to match
 * how a real stretched-canvas print actually looks from the side.
 *
 * The vertex/index buffer is embedded as a base64 data URI directly in the
 * JSON (no separate .bin file); the texture stays an external reference to
 * the artwork's existing image URL, so nothing gets re-hosted or
 * re-encoded — model-viewer/three.js fetch it exactly like an <img> would.
 */

const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

// Gallery-wrap canvas depth. Small relative to typical artwork sizes, just
// enough to give every face real geometry instead of a zero-thickness plane.
const DEPTH_METERS = 0.02;
// Raw canvas/paper color for the back and side faces — no texture, just a
// plain, slightly warm off-white so the edge reads as material, not a glitch.
const CANVAS_BACK_COLOR = [0.94, 0.93, 0.9, 1];

interface Face {
  // Corners in CCW order as seen from outside the box (so the default
  // winding produces an outward-facing normal without extra bookkeeping).
  corners: [number, number, number][];
  normal: [number, number, number];
  uvs?: [number, number][];
}

export function buildArtworkQuadGltf(input: { widthCm: number; heightCm: number; imageUrl: string; title: string }): object {
  const w = input.widthCm / 100;
  const h = input.heightCm / 100;
  const hw = w / 2;
  const hh = h / 2;
  const hd = DEPTH_METERS / 2;

  // glTF texcoord origin is top-left, so the bottom-left vertex maps to the
  // bottom-left of the image (v=1) and so on.
  const frontUvs: [number, number][] = [[0, 1], [1, 1], [1, 0], [0, 0]];

  const frontFace: Face = {
    corners: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]],
    normal: [0, 0, 1],
    uvs: frontUvs,
  };
  const untexturedFaces: Face[] = [
    { corners: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], normal: [0, 0, -1] }, // back
    { corners: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], normal: [0, 1, 0] }, // top
    { corners: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], normal: [0, -1, 0] }, // bottom
    { corners: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], normal: [1, 0, 0] }, // right
    { corners: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], normal: [-1, 0, 0] }, // left
  ];

  function faceBuffers(faces: Face[], includeUvs: boolean) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    faces.forEach((face, faceIndex) => {
      const base = faceIndex * 4;
      for (let i = 0; i < 4; i++) {
        positions.push(...face.corners[i]);
        normals.push(...face.normal);
        if (includeUvs) uvs.push(...(face.uvs?.[i] ?? [0, 0]));
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
  }

  const front = faceBuffers([frontFace], true);
  const rest = faceBuffers(untexturedFaces, false);

  const chunks = [
    { bytes: new Uint8Array(front.positions.buffer), target: ARRAY_BUFFER },
    { bytes: new Uint8Array(front.normals.buffer), target: ARRAY_BUFFER },
    { bytes: new Uint8Array(front.uvs.buffer), target: ARRAY_BUFFER },
    { bytes: new Uint8Array(front.indices.buffer), target: ELEMENT_ARRAY_BUFFER },
    { bytes: new Uint8Array(rest.positions.buffer), target: ARRAY_BUFFER },
    { bytes: new Uint8Array(rest.normals.buffer), target: ARRAY_BUFFER },
    { bytes: new Uint8Array(rest.indices.buffer), target: ELEMENT_ARRAY_BUFFER },
  ];
  let offset = 0;
  const bufferViews = chunks.map((chunk) => {
    const view = { buffer: 0, byteOffset: offset, byteLength: chunk.bytes.byteLength, target: chunk.target };
    offset += chunk.bytes.byteLength;
    return view;
  });
  const combined = new Uint8Array(offset);
  let writeOffset = 0;
  for (const chunk of chunks) {
    combined.set(chunk.bytes, writeOffset);
    writeOffset += chunk.bytes.byteLength;
  }
  const base64 = Buffer.from(combined).toString("base64");

  return {
    asset: { version: "2.0", generator: "atelier-artwork-quad" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: input.title }],
    meshes: [
      {
        primitives: [
          { attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 },
          { attributes: { POSITION: 4, NORMAL: 5 }, indices: 6, material: 1 },
        ],
      },
    ],
    materials: [
      {
        name: input.title,
        pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 },
        doubleSided: true,
      },
      {
        name: `${input.title} (canvas edge)`,
        pbrMetallicRoughness: { baseColorFactor: CANVAS_BACK_COLOR, metallicFactor: 0, roughnessFactor: 0.85 },
        doubleSided: true,
      },
    ],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }],
    images: [{ uri: input.imageUrl }],
    accessors: [
      { bufferView: 0, componentType: FLOAT, count: 4, type: "VEC3", min: [-hw, -hh, hd], max: [hw, hh, hd] },
      { bufferView: 1, componentType: FLOAT, count: 4, type: "VEC3" },
      { bufferView: 2, componentType: FLOAT, count: 4, type: "VEC2" },
      { bufferView: 3, componentType: UNSIGNED_SHORT, count: 6, type: "SCALAR" },
      { bufferView: 4, componentType: FLOAT, count: rest.positions.length / 3, type: "VEC3", min: [-hw, -hh, -hd], max: [hw, hh, hd] },
      { bufferView: 5, componentType: FLOAT, count: rest.normals.length / 3, type: "VEC3" },
      { bufferView: 6, componentType: UNSIGNED_SHORT, count: rest.indices.length, type: "SCALAR" },
    ],
    bufferViews,
    buffers: [{ byteLength: offset, uri: `data:application/octet-stream;base64,${base64}` }],
  };
}
