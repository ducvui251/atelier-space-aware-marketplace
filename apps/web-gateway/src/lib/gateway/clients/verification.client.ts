import { requestService } from "../http-client";

export function reviewArtwork(id: string, input: Record<string, unknown>) { return requestService<Record<string, unknown>>("verification", `/v1/verification/artworks/${encodeURIComponent(id)}/review`, { method: "POST", body: input }); }
export function reviewArtist(id: string, input: Record<string, unknown>) { return requestService<Record<string, unknown>>("verification", `/v1/verification/artists/${encodeURIComponent(id)}/review`, { method: "POST", body: input }); }
