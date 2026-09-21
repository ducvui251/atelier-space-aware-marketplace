import { ExhibitionSceneDocumentSchema } from "@atelier/contracts";
import type { Exhibition, ExhibitionCreatorType, ExhibitionPlacement, ExhibitionSceneDocument, SceneWall } from "@atelier/contracts";
import { query } from "@atelier/persistence";
import { requestInternalService } from "@atelier/config/service-client";

export interface Actor {
  id: string;
  role: ExhibitionCreatorType;
}

type ExhibitionRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  creator_type: string;
  creator_id: string;
  room_template_id: string;
  room_width: string | null;
  room_depth: string | null;
  wall_color: string | null;
  wall_segments: string | null;
  scene_document: string | null;
  status: string;
  featured: boolean;
  artwork_count: number;
  preview_artwork_id: string | null;
  created_at: string;
  updated_at: string;
};

type PlacementRow = {
  id: string;
  exhibition_id: string;
  artwork_id: string;
  position_x: string;
  position_y: string;
  position_z: string;
  rotation_x: string;
  rotation_y: string;
  rotation_z: string;
  scale: string;
  wall_id: string | null;
  frame_style: string | null;
  placement_order: number | null;
  created_at: string;
  updated_at: string;
};

// Every exhibition query aliases the table as `e` so these two correlated
// subqueries (read-model enrichment, not stored columns) resolve the same
// way in SELECT, INSERT ... RETURNING, and UPDATE ... RETURNING.
const EXHIBITION_COLUMNS = `e.id::text, e.title, e.slug, e.description, e.creator_type, e.creator_id::text, e.room_template_id, e.room_width::text, e.room_depth::text, e.wall_color, e.wall_segments::text, e.scene_document::text, e.status, e.featured, e.created_at::text, e.updated_at::text,
  (select count(*) from room_preview.exhibition_placements p where p.exhibition_id = e.id)::int as artwork_count,
  (select p.artwork_id::text from room_preview.exhibition_placements p where p.exhibition_id = e.id order by p.placement_order nulls last, p.created_at limit 1) as preview_artwork_id`;
const PLACEMENT_COLUMNS = `id::text, exhibition_id::text, artwork_id::text, position_x::text, position_y::text, position_z::text, rotation_x::text, rotation_y::text, rotation_z::text, scale::text, wall_id, frame_style, placement_order, created_at::text, updated_at::text`;

function parseWallSegments(raw: string | null): SceneWall[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((seg) => {
      const s = seg as Record<string, unknown>;
      const start = s.start as unknown[];
      const end = s.end as unknown[];
      return {
        id: String(s.id ?? `w-${Math.random().toString(36).slice(2, 8)}`),
        start: [Number(start?.[0] ?? 0), Number(start?.[1] ?? 0)] as [number, number],
        end: [Number(end?.[0] ?? 0), Number(end?.[1] ?? 0)] as [number, number],
        height: Number(s.height ?? 3.2),
        thickness: Number(s.thickness ?? 0.15),
      };
    }).filter((w) => Number.isFinite(w.start[0]) && Number.isFinite(w.start[1]) && Number.isFinite(w.end[0]) && Number.isFinite(w.end[1]));
  } catch {
    return undefined;
  }
}

function mapExhibition(row: ExhibitionRow): Exhibition {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    ...(row.description ? { description: row.description } : {}),
    creatorType: row.creator_type as ExhibitionCreatorType,
    creatorId: row.creator_id,
    roomTemplateId: row.room_template_id,
    ...(row.room_width !== null ? { roomWidth: Number(row.room_width) } : {}),
    ...(row.room_depth !== null ? { roomDepth: Number(row.room_depth) } : {}),
    ...(row.wall_color ? { wallColor: row.wall_color } : {}),
    ...(row.wall_segments ? { wallSegments: parseWallSegments(row.wall_segments) } : {}),
    ...(row.scene_document ? { scene: parseSceneDocument(row.scene_document) } : {}),
    status: row.status as Exhibition["status"],
    featured: row.featured,
    artworkCount: row.artwork_count,
    ...(row.preview_artwork_id ? { previewArtworkId: row.preview_artwork_id } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSceneDocument(raw: string | null): ExhibitionSceneDocument | undefined {
  if (!raw) return undefined;
  try {
    const parsed = ExhibitionSceneDocumentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function mapPlacement(row: PlacementRow): ExhibitionPlacement {
  return {
    id: row.id,
    exhibitionId: row.exhibition_id,
    artworkId: row.artwork_id,
    positionX: Number(row.position_x),
    positionY: Number(row.position_y),
    positionZ: Number(row.position_z),
    rotationX: Number(row.rotation_x),
    rotationY: Number(row.rotation_y),
    rotationZ: Number(row.rotation_z),
    scale: Number(row.scale),
    ...(row.wall_id ? { wallId: row.wall_id } : {}),
    ...(row.frame_style ? { frameStyle: row.frame_style } : {}),
    ...(row.placement_order !== null ? { order: row.placement_order } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Ownership rule (3D Exhibition Implementation Plan §12): an admin may
 * manage any exhibition; an artist may only manage exhibitions they
 * themselves created.
 */
export function canManageExhibition(exhibition: Exhibition, actor: Actor): boolean {
  if (actor.role === "admin") return true;
  return exhibition.creatorType === "artist" && exhibition.creatorId === actor.id;
}

export async function listExhibitions(filter: { creatorId?: string; status?: string; slug?: string }): Promise<Exhibition[]> {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.creatorId) {
    params.push(filter.creatorId);
    conditions.push(`creator_id = $${params.length}::uuid`);
  }
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filter.slug) {
    params.push(filter.slug);
    conditions.push(`slug = $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const rows = await query<ExhibitionRow>(
    `select ${EXHIBITION_COLUMNS} from room_preview.exhibitions e ${where} order by e.created_at desc`,
    params,
  );
  return rows.map(mapExhibition);
}

export async function findExhibitionById(id: string): Promise<Exhibition | null> {
  const rows = await query<ExhibitionRow>(
    `select ${EXHIBITION_COLUMNS} from room_preview.exhibitions e where e.id::text = $1`,
    [id],
  );
  return rows[0] ? mapExhibition(rows[0]) : null;
}

/** Returns null when the slug is already taken. */
export async function createExhibition(input: {
  creatorType: ExhibitionCreatorType;
  creatorId: string;
  title: string;
  slug: string;
  description?: string;
  roomTemplateId: string;
  roomWidth?: number;
  roomDepth?: number;
  wallColor?: string;
  wallSegments?: SceneWall[];
  scene?: ExhibitionSceneDocument;
  featured?: boolean;
}): Promise<Exhibition | null> {
  const existing = await query<{ id: string }>(`select id::text from room_preview.exhibitions where slug = $1`, [input.slug]);
  if (existing[0]) return null;

  const rows = await query<ExhibitionRow>(
    `insert into room_preview.exhibitions as e (title, slug, description, creator_type, creator_id, room_template_id, room_width, room_depth, wall_color, wall_segments, scene_document, featured)
     values ($1, $2, $3, $4, $5::uuid, $6, $7, $8, $9, $10, $11, $12)
     returning ${EXHIBITION_COLUMNS}`,
    [
      input.title,
      input.slug,
      input.description ?? null,
      input.creatorType,
      input.creatorId,
      input.roomTemplateId,
      input.roomWidth ?? null,
      input.roomDepth ?? null,
      input.wallColor ?? null,
      input.wallSegments ? JSON.stringify(input.wallSegments) : null,
      input.scene ? JSON.stringify(input.scene) : null,
      input.featured ?? false,
    ],
  );
  return mapExhibition(rows[0]);
}

/** Returns null when the slug is already taken by a different exhibition. */
export async function updateExhibition(
  id: string,
  patch: {
    title?: string;
    slug?: string;
    description?: string;
    roomTemplateId?: string;
    roomWidth?: number;
    roomDepth?: number;
    wallColor?: string;
    wallSegments?: SceneWall[];
    scene?: ExhibitionSceneDocument;
    status?: Exhibition["status"];
    featured?: boolean;
  },
): Promise<Exhibition | null> {
  if (patch.slug) {
    const existing = await query<{ id: string }>(`select id::text from room_preview.exhibitions where slug = $1 and id::text != $2`, [patch.slug, id]);
    if (existing[0]) return null;
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  const addSet = (column: string, value: unknown) => {
    params.push(value);
    setClauses.push(`${column} = $${params.length}`);
  };
  if (patch.title !== undefined) addSet("title", patch.title);
  if (patch.slug !== undefined) addSet("slug", patch.slug);
  if (patch.description !== undefined) addSet("description", patch.description);
  if (patch.roomTemplateId !== undefined) addSet("room_template_id", patch.roomTemplateId);
  if (patch.roomWidth !== undefined) addSet("room_width", patch.roomWidth);
  if (patch.roomDepth !== undefined) addSet("room_depth", patch.roomDepth);
  if (patch.wallColor !== undefined) addSet("wall_color", patch.wallColor);
  if (patch.wallSegments !== undefined) addSet("wall_segments", JSON.stringify(patch.wallSegments));
  if (patch.scene !== undefined) addSet("scene_document", JSON.stringify(patch.scene));
  if (patch.status !== undefined) addSet("status", patch.status);
  if (patch.featured !== undefined) addSet("featured", patch.featured);
  if (setClauses.length === 0) return findExhibitionById(id);

  params.push(id);
  const rows = await query<ExhibitionRow>(
    `update room_preview.exhibitions as e set ${setClauses.join(", ")} where e.id::text = $${params.length}
     returning ${EXHIBITION_COLUMNS}`,
    params,
  );
  return rows[0] ? mapExhibition(rows[0]) : null;
}

export async function deleteExhibition(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`delete from room_preview.exhibitions where id::text = $1 returning id::text`, [id]);
  return Boolean(rows[0]);
}

export async function listExhibitionPlacements(exhibitionId: string): Promise<ExhibitionPlacement[]> {
  const rows = await query<PlacementRow>(
    `select ${PLACEMENT_COLUMNS} from room_preview.exhibition_placements where exhibition_id::text = $1 order by placement_order nulls last, created_at`,
    [exhibitionId],
  );
  return rows.map(mapPlacement);
}

/**
 * An artist may only place their own artworks (§12); admins may place any
 * artist's. Ownership is verified over HTTP against artist-artwork-service,
 * never by joining across schemas.
 *
 * Every placement, regardless of who makes it, additionally requires the
 * artwork itself to be `verified` — a pending or rejected piece has not
 * cleared the marketplace's authenticity review and must not appear in a
 * public 3D exhibition. This applies to admins too: verification review is
 * a separate gate from ownership, not something the admin role bypasses.
 */
export async function canUseArtwork(artworkId: string, actor: Actor, correlationId: string): Promise<boolean> {
  const artwork = await requestInternalService<{ artistId: string; verificationStatus: string }>(
    "artist-artwork",
    `/v1/artist-artwork/artworks/${encodeURIComponent(artworkId)}`,
    { correlationId },
  ).catch(() => null);
  if (!artwork || artwork.verificationStatus !== "verified") return false;
  return actor.role === "admin" || artwork.artistId === actor.id;
}

export async function createExhibitionPlacement(
  exhibitionId: string,
  input: {
    artworkId: string;
    positionX?: number;
    positionY?: number;
    positionZ?: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    scale?: number;
    wallId?: string;
    frameStyle?: string;
    order?: number;
  },
): Promise<ExhibitionPlacement> {
  const rows = await query<PlacementRow>(
    `insert into room_preview.exhibition_placements
       (exhibition_id, artwork_id, position_x, position_y, position_z, rotation_x, rotation_y, rotation_z, scale, wall_id, frame_style, placement_order)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning ${PLACEMENT_COLUMNS}`,
    [
      exhibitionId,
      input.artworkId,
      input.positionX ?? 0,
      input.positionY ?? 0,
      input.positionZ ?? 0,
      input.rotationX ?? 0,
      input.rotationY ?? 0,
      input.rotationZ ?? 0,
      input.scale ?? 1,
      input.wallId ?? null,
      input.frameStyle ?? null,
      input.order ?? null,
    ],
  );
  return mapPlacement(rows[0]);
}

export async function findExhibitionPlacement(exhibitionId: string, placementId: string): Promise<ExhibitionPlacement | null> {
  const rows = await query<PlacementRow>(
    `select ${PLACEMENT_COLUMNS} from room_preview.exhibition_placements where exhibition_id::text = $1 and id::text = $2`,
    [exhibitionId, placementId],
  );
  return rows[0] ? mapPlacement(rows[0]) : null;
}

export async function updateExhibitionPlacement(
  exhibitionId: string,
  placementId: string,
  patch: {
    positionX?: number;
    positionY?: number;
    positionZ?: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    scale?: number;
    wallId?: string;
    frameStyle?: string;
    order?: number;
  },
): Promise<ExhibitionPlacement | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  const addSet = (column: string, value: unknown) => {
    params.push(value);
    setClauses.push(`${column} = $${params.length}`);
  };
  if (patch.positionX !== undefined) addSet("position_x", patch.positionX);
  if (patch.positionY !== undefined) addSet("position_y", patch.positionY);
  if (patch.positionZ !== undefined) addSet("position_z", patch.positionZ);
  if (patch.rotationX !== undefined) addSet("rotation_x", patch.rotationX);
  if (patch.rotationY !== undefined) addSet("rotation_y", patch.rotationY);
  if (patch.rotationZ !== undefined) addSet("rotation_z", patch.rotationZ);
  if (patch.scale !== undefined) addSet("scale", patch.scale);
  if (patch.wallId !== undefined) addSet("wall_id", patch.wallId);
  if (patch.frameStyle !== undefined) addSet("frame_style", patch.frameStyle);
  if (patch.order !== undefined) addSet("placement_order", patch.order);
  if (setClauses.length === 0) return findExhibitionPlacement(exhibitionId, placementId);

  params.push(exhibitionId, placementId);
  const rows = await query<PlacementRow>(
    `update room_preview.exhibition_placements set ${setClauses.join(", ")}
     where exhibition_id::text = $${params.length - 1} and id::text = $${params.length}
     returning ${PLACEMENT_COLUMNS}`,
    params,
  );
  return rows[0] ? mapPlacement(rows[0]) : null;
}

export async function deleteExhibitionPlacement(exhibitionId: string, placementId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `delete from room_preview.exhibition_placements where exhibition_id::text = $1 and id::text = $2 returning id::text`,
    [exhibitionId, placementId],
  );
  return Boolean(rows[0]);
}
