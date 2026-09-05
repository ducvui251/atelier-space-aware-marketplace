import type { Artwork } from "@atelier/contracts";
import { searchArtworks } from "../domain/search-rules";
import type { ArtworkSearchFilters } from "../transport/v1";
export function discoverArtworks(artworks: readonly Artwork[], filters: ArtworkSearchFilters): Artwork[] { return searchArtworks(artworks, filters); }
