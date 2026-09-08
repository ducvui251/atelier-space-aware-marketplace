import type { Collection } from "@atelier/contracts";
import { query } from "@atelier/persistence";

interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string;
  artwork_count: string;
}

/**
 * Curated collections with a truthful artwork count derived from
 * collection_items at read time (migration 0011). Owned by Catalog &
 * Discovery; never sourced from Gateway fixtures.
 */
export async function listCollections(): Promise<Collection[]> {
  const rows = await query<CollectionRow>(
    `select c.id::text, c.slug, c.title, c.description, c.image_url,
            count(i.artwork_id)::text as artwork_count
     from catalog_discovery.collections c
     left join catalog_discovery.collection_items i on i.collection_id = c.id
     group by c.id, c.slug, c.title, c.description, c.image_url, c.sort_order
     order by c.sort_order, c.title`,
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    artworkCount: Number(row.artwork_count),
  }));
}
