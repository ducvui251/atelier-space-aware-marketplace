import type { Artist, Artwork, VerificationStatus } from "@atelier/contracts";
export function reviewArtwork(artwork: Artwork, status: VerificationStatus, reviewedBy: string, note?: string): Artwork { return { ...artwork, verificationStatus: status, reviewedBy, verificationNote: note, reviewedAt: new Date().toISOString() }; }
export function reviewArtist(artist: Artist, status: VerificationStatus, reviewedBy: string, note?: string): Artist { return { ...artist, verificationStatus: status, reviewedBy, verificationNote: note, reviewedAt: new Date().toISOString() }; }
