export type ArtworkOrientation = "portrait" | "landscape" | "square";

export type EditionType = "original" | "limited-edition";

export type VerificationStatus = "pending" | "verified" | "rejected";

export type Availability = "available" | "reserved" | "sold";

export interface Artwork {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  price: number;
  currency: string;
  widthCm: number;
  heightCm: number;
  medium: string;
  style: string[];
  dominantColors: string[];
  editionType: EditionType;
  availability: Availability;
  verificationStatus: VerificationStatus;
  imageUrl: string;
  orientation: ArtworkOrientation;
  year: number;
}

export interface Artist {
  id: string;
  displayName: string;
  location: string;
  nationality: string;
  bio: string;
  verificationStatus: VerificationStatus;
  imageUrl: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  artworkCount: number;
}

export interface RoomPreset {
  id: string;
  name: string;
}

export type DiscoveryView = "catalog" | "room";
