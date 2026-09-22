/**
 * Builds a minimal glTF 2.0 asset for a single artwork: a flat, real-scale
 * quad (metres, matching the artwork's actual widthCm/heightCm) textured
 * with the artwork's own image — nothing more. That's all AR placement
 * needs (see the "View in AR" flow): the quad's real-world size is what
 * lets an AR session drop it onto the buyer's wall at true scale.
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

export function buildArtworkQuadGltf(input: { widthCm: number; heightCm: number; imageUrl: string; title: string }): object {
  const w = input.widthCm / 100;
  const h = input.heightCm / 100;
  const hw = w / 2;
  const hh = h / 2;

  // Front face points +Z (toward model-viewer's default camera). Winding
  // (0,1,2)/(0,2,3) is counter-clockwise when viewed from +Z.
  const positions = new Float32Array([
    -hw, -hh, 0,
    hw, -hh, 0,
    hw, hh, 0,
    -hw, hh, 0,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  // glTF texcoord origin is top-left, so the bottom-left vertex (-hw,-hh)
  // maps to the bottom-left of the image (v=1) and so on.
  const uvs = new Float32Array([
    0, 1,
    1, 1,
    1, 0,
    0, 0,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const positionsBytes = new Uint8Array(positions.buffer);
  const normalsBytes = new Uint8Array(normals.buffer);
  const uvsBytes = new Uint8Array(uvs.buffer);
  const indicesBytes = new Uint8Array(indices.buffer);

  const positionsOffset = 0;
  const normalsOffset = positionsBytes.byteLength;
  const uvsOffset = normalsOffset + normalsBytes.byteLength;
  const indicesOffset = uvsOffset + uvsBytes.byteLength;
  const totalLength = indicesOffset + indicesBytes.byteLength;

  const combined = new Uint8Array(totalLength);
  combined.set(positionsBytes, positionsOffset);
  combined.set(normalsBytes, normalsOffset);
  combined.set(uvsBytes, uvsOffset);
  combined.set(indicesBytes, indicesOffset);

  const base64 = Buffer.from(combined).toString("base64");

  return {
    asset: { version: "2.0", generator: "atelier-artwork-quad" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: input.title }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: input.title,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 1,
        },
        doubleSided: true,
      },
    ],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }],
    images: [{ uri: input.imageUrl }],
    accessors: [
      {
        bufferView: 0,
        componentType: FLOAT,
        count: 4,
        type: "VEC3",
        min: [-hw, -hh, 0],
        max: [hw, hh, 0],
      },
      { bufferView: 1, componentType: FLOAT, count: 4, type: "VEC3" },
      { bufferView: 2, componentType: FLOAT, count: 4, type: "VEC2" },
      { bufferView: 3, componentType: UNSIGNED_SHORT, count: 6, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: positionsOffset, byteLength: positionsBytes.byteLength, target: ARRAY_BUFFER },
      { buffer: 0, byteOffset: normalsOffset, byteLength: normalsBytes.byteLength, target: ARRAY_BUFFER },
      { buffer: 0, byteOffset: uvsOffset, byteLength: uvsBytes.byteLength, target: ARRAY_BUFFER },
      { buffer: 0, byteOffset: indicesOffset, byteLength: indicesBytes.byteLength, target: ELEMENT_ARRAY_BUFFER },
    ],
    buffers: [{ byteLength: totalLength, uri: `data:application/octet-stream;base64,${base64}` }],
  };
}
