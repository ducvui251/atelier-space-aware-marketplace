import type { ExhibitionSceneStyle, ExhibitionSurfaceMaterial } from "@atelier/contracts";

export const DEFAULT_SCENE_STYLE: ExhibitionSceneStyle = {
  wallColor: "#f7fafc",
  floorColor: "#102d48",
  ceilingColor: "#f7fafc",
  environmentColor: "#181a1e",
  lightColor: "#dbeafe",
  wallMaterial: "matte",
  floorMaterial: "satin",
  ambientLightIntensity: 0.7,
  directionalLightIntensity: 1.2,
};

const MATERIAL_PROPERTIES: Record<ExhibitionSurfaceMaterial, { roughness: number; metalness: number }> = {
  matte: { roughness: 0.92, metalness: 0 },
  satin: { roughness: 0.58, metalness: 0.04 },
  polished: { roughness: 0.24, metalness: 0.08 },
};

export function resolveSceneStyle(style?: ExhibitionSceneStyle): ExhibitionSceneStyle {
  return { ...DEFAULT_SCENE_STYLE, ...style };
}

export function materialPropertiesFor(material: ExhibitionSurfaceMaterial) {
  return MATERIAL_PROPERTIES[material];
}
