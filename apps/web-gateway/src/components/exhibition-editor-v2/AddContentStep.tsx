"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Check, Lock, Maximize2, Minimize2, Plus, Trash2 } from "lucide-react";
import { IMAGE_UPLOAD_ALLOWED_MIME_TYPES, type Artwork, type ExhibitionPlacement, type ExhibitionSceneDocument, type ExhibitionSceneImagePlacement, type ExhibitionSceneLevel, type ExhibitionSceneStyle, type ExhibitionSceneWall, type SceneWall } from "@atelier/contracts";
import type { ThreeEvent } from "@react-three/fiber";
import { apiFetch, ApiError } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Lighting } from "@/components/spatial/Lighting";
import { RoomEnvironment } from "@/components/spatial/RoomEnvironment";
import { ArtworkMesh } from "@/components/spatial/ArtworkMesh";
import { wallInwardNormal, wallLength, wallTransformFor, type WallPlacementTransform } from "./wall-placement-geometry";
import { KeyboardCameraControls, type OrbitControlsHandle } from "./KeyboardCameraControls";

/**
 * Placement wall IDs are opaque strings in CreateExhibitionPlacementRequestSchema.
 * The transform is derived from each scene wall's endpoints, so custom Define
 * Space walls and the legacy four-wall templates use the same placement path.
 */
type FrameStyle = "dark-wood" | "light-wood" | "black" | "white";
const FRAME_STYLES: Array<{ id: FrameStyle; label: string; color: string }> = [
  { id: "dark-wood", label: "Dark wood", color: "#3b2a1a" },
  { id: "light-wood", label: "Light oak", color: "#c9a873" },
  { id: "black", label: "Black", color: "#1a1a1a" },
  { id: "white", label: "White", color: "#f2f0ea" },
];

interface UploadedImage {
  id: string;
  name: string;
  imageUrl: string;
  widthMeters: number;
  heightMeters: number;
}

interface UploadedImagePlacement {
  id: string;
  image: UploadedImage;
  wallId: string;
  transform: WallPlacementTransform;
}

function fromSceneImagePlacement(placement: ExhibitionSceneImagePlacement): UploadedImagePlacement {
  return {
    id: placement.id,
    image: {
      id: placement.id,
      name: placement.name,
      imageUrl: placement.imageUrl,
      widthMeters: placement.widthMeters,
      heightMeters: placement.heightMeters,
    },
    wallId: placement.wallId,
    transform: {
      positionX: placement.positionX,
      positionY: placement.positionY,
      positionZ: placement.positionZ,
      rotationY: placement.rotationY,
    },
  };
}

function toSceneImagePlacement(placement: UploadedImagePlacement): ExhibitionSceneImagePlacement {
  return {
    id: placement.id,
    name: placement.image.name,
    imageUrl: placement.image.imageUrl,
    widthMeters: placement.image.widthMeters,
    heightMeters: placement.image.heightMeters,
    wallId: placement.wallId,
    ...placement.transform,
  };
}

interface PendingImagePlacement extends WallPlacementTransform {
  wallId: string;
}

type WallPointerHandler = (event: ThreeEvent<PointerEvent>, wall: SceneWall) => void;
type TransformField = "positionX" | "positionY" | "positionZ" | "rotationY" | "scale";
const TRANSFORM_FIELDS: Array<{ name: TransformField; label: string; min: number; max: number; step: number }> = [
  { name: "positionX", label: "X (m)", min: -25, max: 25, step: 0.05 },
  { name: "positionY", label: "Y (m)", min: 0, max: 3.2, step: 0.05 },
  { name: "positionZ", label: "Z (m)", min: -25, max: 25, step: 0.05 },
  { name: "rotationY", label: "Rotation Y (°)", min: -360, max: 360, step: 1 },
  { name: "scale", label: "Scale", min: 0.1, max: 5, step: 0.05 },
];

function frameColorFor(frameStyle?: string) {
  return FRAME_STYLES.find((style) => style.id === frameStyle)?.color ?? "#2a2622";
}

function readImageAspectRatio(url: string) {
  return new Promise<number>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1);
    image.onerror = () => resolve(1);
    image.src = url;
  });
}

function imageSizeMeters(aspectRatio: number) {
  const widthMeters = aspectRatio >= 1 ? 1.5 : Math.max(0.45, 1.5 * aspectRatio);
  return { widthMeters, heightMeters: widthMeters / Math.max(aspectRatio, 0.01) };
}

function clampImageHeight(wall: SceneWall, image: UploadedImage, positionY: number) {
  const wallHeight = Number.isFinite(wall.height) && wall.height > 0 ? wall.height : 3.2;
  const margin = 0.05;
  const minY = image.heightMeters / 2 + margin;
  const maxY = Math.max(minY, wallHeight - image.heightMeters / 2 - margin);
  return Math.min(Math.max(positionY, minY), maxY);
}

function defaultWallSlot(index: number, walls: ExhibitionSceneWall[]) {
  const wall = walls[index % walls.length];
  const repeatsOnWall = Math.floor(index / walls.length);
  const offset = (repeatsOnWall % 5) - 2;
  const length = wallLength(wall);
  const spacing = Math.min(1.65, length / 6);
  const along = length > 1
    ? Math.min(Math.max(length / 2 + offset * spacing, 0.5), length - 0.5)
    : length / 2;
  return { ...wallTransformFor(wall, along, walls), wallId: wall.id };
}

function readError(error: unknown) {
  return error instanceof ApiError ? error.message : "Could not save changes. Please retry.";
}

function verificationBadge(artwork: Artwork) {
  if (artwork.verificationStatus === "verified") return <Badge variant="success">Verified</Badge>;
  if (artwork.verificationStatus === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="warning">Pending review</Badge>;
}

function GalleryPreview({
  roomTemplateId,
  roomWidth,
  roomDepth,
  walls,
  style,
  placedArtworks,
  placedUploadedImages,
  pendingImage,
  pendingPlacement,
  selectedUploadedImageId,
  selectedPlacementId,
  onSelect,
  onSelectUploadedImage,
  onWallPointerMove,
  onWallPointerDown,
  onPendingPointerMove,
  onPendingPlace,
}: {
  roomTemplateId: string;
  roomWidth: number;
  roomDepth: number;
  walls: ExhibitionSceneWall[];
  style?: ExhibitionSceneStyle;
  placedArtworks: Array<{ placement: ExhibitionPlacement; artwork: Artwork }>;
  placedUploadedImages: UploadedImagePlacement[];
  pendingImage: UploadedImage | null;
  pendingPlacement: PendingImagePlacement | null;
  selectedUploadedImageId: string | null;
  selectedPlacementId: string | null;
  onSelect: (placementId: string) => void;
  onSelectUploadedImage: (placementId: string) => void;
  onWallPointerMove: WallPointerHandler;
  onWallPointerDown: WallPointerHandler;
  onPendingPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPendingPlace: () => void;
}) {
  const controlsRef = useRef<OrbitControlsHandle | null>(null);
  const setOrbitControlsRef = useCallback((instance: OrbitControlsHandle | null) => {
    controlsRef.current = instance;
  }, []);

  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, roomDepth, roomDepth * 1.3], fov: 50, near: 0.1, far: 200 }}>
      <color attach="background" args={[style?.environmentColor ?? "#dbe4ee"]} />
      <Lighting templateId={roomTemplateId} style={style} />
      <RoomEnvironment
        templateId={roomTemplateId}
        width={roomWidth}
        depth={roomDepth}
        wallSegments={walls}
        style={style}
        onWallPointerMove={onWallPointerMove}
        onWallPointerDown={onWallPointerDown}
      />
      {placedArtworks.map(({ placement, artwork }) => (
        <ArtworkMesh
          key={placement.id}
          position={[placement.positionX, placement.positionY, placement.positionZ]}
          rotationY={(placement.rotationY * Math.PI) / 180}
          widthMeters={(artwork.widthCm / 100) * placement.scale}
          heightMeters={(artwork.heightCm / 100) * placement.scale}
          imageUrl={artwork.imageUrl}
          frameColor={frameColorFor(placement.frameStyle)}
          selected={placement.id === selectedPlacementId}
          onSelect={() => onSelect(placement.id)}
        />
      ))}
      {placedUploadedImages.map(({ id, image, transform }) => (
        <ArtworkMesh
          key={id}
          position={[transform.positionX, transform.positionY, transform.positionZ]}
          rotationY={(transform.rotationY * Math.PI) / 180}
          widthMeters={image.widthMeters}
          heightMeters={image.heightMeters}
          imageUrl={image.imageUrl}
          frameColor="#2a2622"
          selected={id === selectedUploadedImageId}
          onSelect={() => onSelectUploadedImage(id)}
        />
      ))}
      {pendingImage && pendingPlacement ? (
        <ArtworkMesh
          key={pendingImage.id}
          position={[pendingPlacement.positionX, pendingPlacement.positionY, pendingPlacement.positionZ]}
          rotationY={(pendingPlacement.rotationY * Math.PI) / 180}
          widthMeters={pendingImage.widthMeters}
          heightMeters={pendingImage.heightMeters}
          imageUrl={pendingImage.imageUrl}
          frameColor="#c9a227"
          onPointerMove={onPendingPointerMove}
          onPlace={onPendingPlace}
        />
      ) : null}
      <KeyboardCameraControls controlsRef={controlsRef} />
      <OrbitControls ref={setOrbitControlsRef} enabled={!pendingImage} enableDamping enablePan enableZoom mouseButtons={{ MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }} target={[0, 1.5, 0]} minDistance={2} maxDistance={40} />
    </Canvas>
  );
}

export function AddContentStep({
  exhibitionId,
  roomTemplateId,
  level,
  walls,
  style,
  scene,
  imagePlacements,
  onImagePlacementsChange,
  onSaveScene,
}: {
  exhibitionId: string;
  roomTemplateId: string;
  level: ExhibitionSceneLevel;
  walls: ExhibitionSceneWall[];
  style?: ExhibitionSceneStyle;
  scene: ExhibitionSceneDocument;
  imagePlacements?: ExhibitionSceneImagePlacement[];
  onImagePlacementsChange: (imagePlacements: ExhibitionSceneImagePlacement[]) => void;
  onSaveScene: (scene: ExhibitionSceneDocument) => Promise<boolean>;
}) {
  const hasWalls = walls.length > 0;
  const [search, setSearch] = useState("");
  const artworksPath = search.trim()
    ? `/api/exhibitions/artworks?q=${encodeURIComponent(search.trim())}`
    : "/api/exhibitions/artworks";
  // Two separate fetches on purpose: `artworksResource` is the search-filtered
  // browse list in the sidebar, while `allArtworksResource` (never filtered)
  // resolves title/image/dimensions for whatever is already placed — so
  // typing in the search box can't make already-placed frames vanish from
  // the 3D preview just because they don't match the current query.
  const artworksResource = useApiResource<{ items: Artwork[]; total: number }>(artworksPath);
  const allArtworksResource = useApiResource<{ items: Artwork[]; total: number }>("/api/exhibitions/artworks");
  const placementsResource = useApiResource<{ items: ExhibitionPlacement[]; total: number }>(
    hasWalls ? `/api/exhibitions/${exhibitionId}/placements` : null,
  );

  const [placements, setPlacements] = useState<ExhibitionPlacement[]>([]);
  useEffect(() => {
    if (placementsResource.data) setPlacements(placementsResource.data.items);
    // Only re-sync when a fresh load actually lands — local edits (add/remove/
    // transform) manage `placements` themselves and shouldn't be clobbered by
    // this effect re-running for unrelated reasons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementsResource.data]);

  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const initialUploadedPlacements = useMemo(() => (imagePlacements ?? []).map(fromSceneImagePlacement), [imagePlacements]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() => {
    const unique = new Map(initialUploadedPlacements.map((placement) => [placement.image.id, placement.image]));
    return [...unique.values()];
  });
  const [placedUploadedImages, setPlacedUploadedImages] = useState<UploadedImagePlacement[]>(initialUploadedPlacements);
  const [uploadedImagesDirty, setUploadedImagesDirty] = useState(false);
  const [selectedUploadedImageId, setSelectedUploadedImageId] = useState<string | null>(null);
  const [movingUploadedPlacement, setMovingUploadedPlacement] = useState<UploadedImagePlacement | null>(null);
  const [pendingImage, setPendingImage] = useState<UploadedImage | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingImagePlacement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageView, setImageView] = useState<"grid" | "list">("grid");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);

  useEffect(() => {
    if (!isPreviewFullscreen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPreviewFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreviewFullscreen]);

  const artworks = artworksResource.data?.items ?? [];
  const allArtworks = allArtworksResource.data?.items ?? [];
  const allArtworkById = useMemo(() => new Map(allArtworks.map((artwork) => [artwork.id, artwork])), [allArtworks]);
  const placedArtworkIds = useMemo(() => new Set(placements.map((placement) => placement.artworkId)), [placements]);
  const placedArtworks = useMemo(
    () => placements.flatMap((placement) => {
      const artwork = allArtworkById.get(placement.artworkId);
      return artwork ? [{ placement, artwork }] : [];
    }),
    [allArtworkById, placements],
  );
  const selectedPlacement = placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedArtwork = selectedPlacement ? allArtworkById.get(selectedPlacement.artworkId) ?? null : null;
  const selectedUploadedImage = placedUploadedImages.find((placement) => placement.id === selectedUploadedImageId) ?? null;

  function updateUploadedPlacements(next: UploadedImagePlacement[]) {
    setPlacedUploadedImages(next);
    onImagePlacementsChange(next.map(toSceneImagePlacement));
    setUploadedImagesDirty(true);
    setSavedMessage(null);
  }

  function startImagePlacement(image: UploadedImage) {
    const wall = walls[0];
    if (!wall) {
      setUploadError("Draw a wall in Define Space before placing an image.");
      return;
    }
    const transform = wallTransformFor(wall, wallLength(wall) / 2, walls);
    setSelectedUploadedImageId(null);
    setMovingUploadedPlacement(null);
    setPendingImage(image);
    setPendingPlacement({ wallId: wall.id, ...transform, positionY: clampImageHeight(wall, image, transform.positionY) });
    setSavedMessage(`Move “${image.name}” over a wall, then click to hang it.`);
    setUploadError(null);
  }

  function placementAtPointer(wall: SceneWall, event: ThreeEvent<PointerEvent>, image: UploadedImage): PendingImagePlacement {
    const length = wallLength(wall);
    const directionX = length > 0 ? (wall.end[0] - wall.start[0]) / length : 0;
    const directionZ = length > 0 ? (wall.end[1] - wall.start[1]) / length : 0;
    const normal = wallInwardNormal(wall, walls);
    const wallPlane = new THREE.Plane(
      new THREE.Vector3(normal[0], 0, normal[1]),
      -(normal[0] * wall.start[0] + normal[1] * wall.start[1]),
    );
    const wallPoint = event.ray.intersectPlane(wallPlane, new THREE.Vector3()) ?? event.point;
    const along = (wallPoint.x - wall.start[0]) * directionX + (wallPoint.z - wall.start[1]) * directionZ;
    const transform = wallTransformFor(wall, along, walls);
    return { wallId: wall.id, ...transform, positionY: clampImageHeight(wall, image, wallPoint.y) };
  }

  function handleWallPointerMove(event: ThreeEvent<PointerEvent>, wall: SceneWall) {
    if (!pendingImage) return;
    setPendingPlacement(placementAtPointer(wall, event, pendingImage));
  }

  function placePendingImage(placement = pendingPlacement) {
    if (!pendingImage || !placement) return;
    const placementId = movingUploadedPlacement?.id ?? `uploaded-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    updateUploadedPlacements([
      ...placedUploadedImages,
      {
        id: placementId,
        image: pendingImage,
        wallId: placement.wallId,
        transform: placement,
      },
    ]);
    setSelectedUploadedImageId(placementId);
    setSelectedPlacementId(null);
    setMovingUploadedPlacement(null);
    setPendingImage(null);
    setPendingPlacement(null);
    setSavedMessage(`“${pendingImage.name}” placed in the editor. Save layout to keep it in the exhibition.`);
  }

  function cancelPendingImage() {
    if (movingUploadedPlacement) {
      updateUploadedPlacements([...placedUploadedImages, movingUploadedPlacement]);
      setSelectedUploadedImageId(movingUploadedPlacement.id);
    }
    setMovingUploadedPlacement(null);
    setPendingImage(null);
    setPendingPlacement(null);
  }

  function handleWallPointerDown(event: ThreeEvent<PointerEvent>, wall: SceneWall) {
    if (!pendingImage) return;
    placePendingImage(placementAtPointer(wall, event, pendingImage));
  }

  function handlePendingPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!pendingImage || !pendingPlacement) return;
    const wall = walls.find((candidate) => candidate.id === pendingPlacement.wallId);
    if (wall) setPendingPlacement(placementAtPointer(wall, event, pendingImage));
  }

  function selectUploadedImage(placementId: string) {
    setSelectedUploadedImageId(placementId);
    setSelectedPlacementId(null);
  }

  function moveSelectedUploadedImage() {
    if (!selectedUploadedImage || pendingImage) return;
    updateUploadedPlacements(placedUploadedImages.filter((placement) => placement.id !== selectedUploadedImage.id));
    setMovingUploadedPlacement(selectedUploadedImage);
    setPendingImage(selectedUploadedImage.image);
    setPendingPlacement({ wallId: selectedUploadedImage.wallId, ...selectedUploadedImage.transform });
    setSelectedUploadedImageId(null);
    setSavedMessage(`Move “${selectedUploadedImage.image.name}” over a wall, then click to hang it.`);
  }

  function removeSelectedUploadedImage() {
    if (!selectedUploadedImage) return;
    updateUploadedPlacements(placedUploadedImages.filter((placement) => placement.id !== selectedUploadedImage.id));
    setSelectedUploadedImageId(null);
    setSavedMessage("Uploaded image removed.");
  }

  async function uploadImage(file: File) {
    if (!hasWalls) {
      setUploadError("Draw a wall in Define Space before uploading an image.");
      return;
    }
    setUploadingImage(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/image", { method: "POST", body });
      const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) throw new ApiError(payload?.error ?? "Image upload failed.", response.status);
      const ratio = await readImageAspectRatio(payload.url);
      const size = imageSizeMeters(ratio);
      const image: UploadedImage = {
        id: `image-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        imageUrl: payload.url,
        ...size,
      };
      setUploadedImages((current) => [image, ...current]);
      startImagePlacement(image);
    } catch (cause) {
      setUploadError(readError(cause));
    } finally {
      setUploadingImage(false);
    }
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadImage(file);
  }

  function markDirty(placementId: string) {
    setDirtyIds((current) => new Set(current).add(placementId));
    setSavedMessage(null);
  }

  function updateSelected(patch: Partial<ExhibitionPlacement>) {
    if (!selectedPlacement) return;
    setPlacements((current) => current.map((placement) => (placement.id === selectedPlacement.id ? { ...placement, ...patch } : placement)));
    markDirty(selectedPlacement.id);
  }

  async function addArtwork(artwork: Artwork) {
    if (!hasWalls) {
      setError("Draw a wall in Define Space before adding artwork.");
      return;
    }
    const existing = placements.find((placement) => placement.artworkId === artwork.id);
    if (existing) {
      setSelectedUploadedImageId(null);
      setSelectedPlacementId(existing.id);
      return;
    }
    setBusy(true);
    setError(null);
    const slot = defaultWallSlot(placements.length, walls);
    try {
      const placement = await apiFetch<ExhibitionPlacement>(`/api/exhibitions/${exhibitionId}/placements`, {
        method: "POST",
        body: JSON.stringify({
          artworkId: artwork.id,
          positionX: slot.positionX,
          positionY: slot.positionY,
          positionZ: slot.positionZ,
          rotationX: 0,
          rotationY: slot.rotationY,
          rotationZ: 0,
          scale: 1,
          wallId: slot.wallId,
          frameStyle: "dark-wood",
          order: placements.length,
        }),
      });
      setPlacements((current) => [...current, placement]);
      setSelectedUploadedImageId(null);
      setSelectedPlacementId(placement.id);
      setSavedMessage("Artwork added to the exhibition.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedPlacement) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/exhibitions/${exhibitionId}/placements/${selectedPlacement.id}`, { method: "DELETE" });
      const remaining = placements.filter((placement) => placement.id !== selectedPlacement.id);
      setPlacements(remaining);
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(selectedPlacement.id);
        return next;
      });
      setSelectedPlacementId(remaining[0]?.id ?? null);
      setSavedMessage("Artwork removed.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || busy || !selectedPlacementId && !selectedUploadedImageId) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      if (selectedUploadedImageId) removeSelectedUploadedImage();
      else void removeSelected();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, selectedPlacement, selectedPlacementId, selectedUploadedImage, selectedUploadedImageId]);

  async function saveLayout() {
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      const dirty = [...dirtyIds];
      const saved = await Promise.all(dirty.map((placementId) => {
        const placement = placements.find((item) => item.id === placementId);
        if (!placement) return Promise.reject(new Error("A selected placement is no longer available."));
        return apiFetch<ExhibitionPlacement>(`/api/exhibitions/${exhibitionId}/placements/${placementId}`, {
          method: "PATCH",
          body: JSON.stringify({
            positionX: placement.positionX,
            positionY: placement.positionY,
            positionZ: placement.positionZ,
            rotationX: placement.rotationX,
            rotationY: placement.rotationY,
            rotationZ: placement.rotationZ,
            scale: placement.scale,
            wallId: placement.wallId,
            frameStyle: placement.frameStyle,
          }),
        });
      }));
      setPlacements((current) => current.map((placement) => saved.find((item) => item.id === placement.id) ?? placement));
      if (uploadedImagesDirty) {
        const savedScene = await onSaveScene({
          ...scene,
          imagePlacements: placedUploadedImages.map(toSceneImagePlacement),
        });
        if (!savedScene) return;
        setUploadedImagesDirty(false);
      }
      setDirtyIds(new Set());
      setSavedMessage("Layout saved.");
    } catch (cause) {
      setError(readError(cause));
    } finally {
      setBusy(false);
    }
  }

  function changeWall(wallId: string) {
    if (!selectedPlacement) return;
    const wall = walls.find((candidate) => candidate.id === wallId);
    if (!wall) return;
    updateSelected({
      ...wallTransformFor(wall, wallLength(wall) / 2, walls),
      positionY: selectedPlacement.positionY,
      wallId,
    });
  }

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="flex max-h-[560px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body-sm font-medium text-foreground">Artworks</h3>
            <Button type="button" size="icon" variant="outline" className="size-8" disabled={uploadingImage || !hasWalls} onClick={() => uploadInputRef.current?.click()} aria-label="Upload artwork" title={hasWalls ? "Upload artwork" : "Draw a wall before uploading artwork"}>
              <Plus className="size-4" />
            </Button>
          </div>
          <input ref={uploadInputRef} type="file" accept={IMAGE_UPLOAD_ALLOWED_MIME_TYPES.join(",")} className="hidden" onChange={handleImageInputChange} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-caption text-muted-foreground">Upload any image, move it, then click a wall to frame it.</span>
            <div className="flex shrink-0 rounded border border-border p-0.5" role="group" aria-label="Image view">
              <button type="button" className={`rounded px-1.5 py-0.5 text-[11px] ${imageView === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`} onClick={() => setImageView("grid")}>Grid</button>
              <button type="button" className={`rounded px-1.5 py-0.5 text-[11px] ${imageView === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`} onClick={() => setImageView("list")}>List</button>
            </div>
          </div>
          {uploadingImage ? <p className="mt-2 text-caption text-muted-foreground">Uploading image...</p> : null}
          {uploadError ? <p className="mt-2 text-caption text-destructive-foreground">{uploadError}</p> : null}
          {!hasWalls ? <p className="mt-2 text-caption text-muted-foreground">Draw a wall in Define Space to enable artwork placement.</p> : null}
          {pendingImage ? (
            <Button type="button" size="sm" variant="outline" className="mt-2 h-7 w-full text-caption" onClick={cancelPendingImage}>
              {movingUploadedPlacement ? "Cancel move" : "Cancel placement"}
            </Button>
          ) : null}
          <Input
            className="mt-2 h-8 text-caption"
            placeholder="Search by title…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {uploadedImages.length ? (
            <div className={imageView === "grid" ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
              {uploadedImages.map((image) => {
                const placed = placedUploadedImages.some((item) => item.image.id === image.id);
                const active = pendingImage?.id === image.id;
                return (
                  <div key={image.id} className={`overflow-hidden rounded-md border ${active ? "border-primary bg-primary/5" : "border-border"}`}>
                    <img src={image.imageUrl} alt={image.name} className={imageView === "grid" ? "h-24 w-full object-cover" : "float-left mr-2 h-12 w-12 object-cover"} />
                    <div className="p-2">
                      <span className="block truncate text-caption font-medium text-foreground">{image.name}</span>
                      <Button type="button" size="sm" variant="outline" className="mt-1.5 h-7 w-full text-caption" disabled={Boolean(pendingImage) || placed} onClick={() => startImagePlacement(image)}>
                        {placed ? "Placed" : active ? "Moving..." : "Place"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {uploadedImages.length && artworks.length ? <div className="my-3 border-t border-border" /> : null}
          <p className="mb-2 px-1 text-caption font-medium text-muted-foreground">Available artworks</p>
          {artworksResource.loading ? (
            <div className="grid gap-2 p-2"><Skeleton className="h-14 rounded-md" /><Skeleton className="h-14 rounded-md" /></div>
          ) : artworksResource.error ? (
            <p className="p-2 text-caption text-destructive-foreground">Couldn&apos;t load your artworks.</p>
          ) : artworks.length ? artworks.map((artwork) => {
            const placement = placements.find((item) => item.artworkId === artwork.id);
            return (
              <div key={artwork.id} className={`mb-2 rounded-md border p-2.5 ${placement?.id === selectedPlacementId ? "border-primary bg-primary/5" : "border-border"}`}>
                <button
                  type="button"
                  className="focus-ring block w-full text-left"
                  onClick={() => {
                    if (!placement) return;
                    setSelectedUploadedImageId(null);
                    setSelectedPlacementId(placement.id);
                  }}
                >
                  <span className="block truncate text-caption font-medium text-foreground">{artwork.title}</span>
                  <span className="mt-1 flex items-center gap-1.5">{verificationBadge(artwork)}</span>
                </button>
                <div className="mt-1.5">
                  {placement ? (
                    <span className="text-caption text-muted-foreground">In gallery</span>
                  ) : artwork.verificationStatus !== "verified" ? (
                    <Button size="sm" variant="outline" className="h-7 w-full text-caption" disabled title="Needs verification before it can go in an exhibition.">
                      <Lock className="size-3" /> Needs verification
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 w-full text-caption" disabled={busy || !hasWalls} title={hasWalls ? undefined : "Draw a wall before adding artwork."} onClick={() => void addArtwork(artwork)}>
                      <Plus className="size-3" /> Add
                    </Button>
                  )}
                </div>
              </div>
            );
          }) : <p className="p-2 text-caption text-muted-foreground">No artworks found.</p>}
        </div>
      </aside>

      <section
        className={`${isPreviewFullscreen ? "fixed inset-0 z-[60] h-screen min-h-0 w-screen rounded-none border-0" : "relative min-h-[420px] rounded-lg border border-border"} overflow-hidden bg-muted`}
      >
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto bg-surface/90"
            aria-label={isPreviewFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"}
            title={isPreviewFullscreen ? "Exit fullscreen preview" : "Fullscreen preview"}
            onClick={() => setIsPreviewFullscreen((value) => !value)}
          >
            {isPreviewFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
        {placementsResource.loading ? (
          <div className="absolute inset-0 grid place-items-center text-caption text-muted-foreground">Loading gallery…</div>
        ) : (
          <GalleryPreview
            roomTemplateId={roomTemplateId}
            roomWidth={level.floor.width}
            roomDepth={level.floor.depth}
            walls={walls}
            style={style}
            placedArtworks={placedArtworks}
            placedUploadedImages={placedUploadedImages}
            pendingImage={pendingImage}
            pendingPlacement={pendingPlacement}
            selectedUploadedImageId={selectedUploadedImageId}
            selectedPlacementId={selectedPlacementId}
            onSelect={(placementId) => {
              setSelectedPlacementId(placementId);
              setSelectedUploadedImageId(null);
            }}
            onSelectUploadedImage={selectUploadedImage}
            onWallPointerMove={handleWallPointerMove}
            onWallPointerDown={handleWallPointerDown}
            onPendingPointerMove={handlePendingPointerMove}
            onPendingPlace={() => placePendingImage()}
          />
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-surface/90 px-2.5 py-1.5 text-caption text-muted-foreground">
          Left click select · Alt+left-drag orbit · middle-drag pan · right mouse + W/A/S/D fly · Q down / E up · hold Shift for 2× speed · scroll to zoom
        </div>
      </section>

      <aside className="max-h-[560px] overflow-y-auto rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="text-body-sm font-medium text-foreground">Properties</h3>
            {selectedArtwork ? <p className="mt-0.5 truncate text-caption text-muted-foreground">{selectedArtwork.title}</p> : selectedUploadedImage ? <p className="mt-0.5 truncate text-caption text-muted-foreground">{selectedUploadedImage.image.name}</p> : <p className="mt-0.5 text-caption text-muted-foreground">Select a placed artwork.</p>}
          </div>
          <Button size="sm" disabled={busy || (dirtyIds.size === 0 && !uploadedImagesDirty)} onClick={() => void saveLayout()}>
            <Check className="size-3.5" /> {busy ? "Saving…" : "Save layout"}
          </Button>
        </div>

        {selectedUploadedImage ? (
          <div className="grid gap-3 pt-3">
            <p className="text-caption text-muted-foreground">Uploaded artworks are saved with this exhibition.</p>
            <Button variant="outline" disabled={Boolean(pendingImage)} onClick={moveSelectedUploadedImage}>Move artwork</Button>
            <Button variant="outline" className="text-destructive-foreground" onClick={removeSelectedUploadedImage}>Delete artwork</Button>
          </div>
        ) : selectedPlacement ? (
          <div className="grid gap-3 pt-3">
            <label className="grid gap-1 text-caption font-medium text-foreground">
              Wall
              <select
                className="focus-ring h-9 w-full rounded-md border border-border bg-surface px-2 text-caption"
                value={walls.some((wall) => wall.id === selectedPlacement.wallId) ? selectedPlacement.wallId : walls[0].id}
                disabled={busy}
                onChange={(event) => changeWall(event.target.value)}
              >
                {walls.map((wall, index) => <option key={wall.id} value={wall.id}>Wall {index + 1}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {TRANSFORM_FIELDS.map((field) => (
                <label key={field.name} className="grid gap-1 text-caption text-muted-foreground">
                  {field.label}
                  <Input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="h-8 text-caption"
                    value={selectedPlacement[field.name]}
                    disabled={busy}
                    onChange={(event) => {
                      if (event.target.value.trim()) updateSelected({ [field.name]: Number(event.target.value) } as Partial<ExhibitionPlacement>);
                    }}
                  />
                </label>
              ))}
            </div>

            <label className="grid gap-1 text-caption font-medium text-foreground">
              Frame
              <select
                className="focus-ring h-9 w-full rounded-md border border-border bg-surface px-2 text-caption"
                value={FRAME_STYLES.some((style) => style.id === selectedPlacement.frameStyle) ? selectedPlacement.frameStyle : "dark-wood"}
                disabled={busy}
                onChange={(event) => updateSelected({ frameStyle: event.target.value })}
              >
                {FRAME_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
              </select>
            </label>

            {selectedArtwork ? (
              <div className="rounded-md bg-muted/40 p-2.5 text-caption text-muted-foreground">
                <p>{selectedArtwork.widthCm} × {selectedArtwork.heightCm} cm</p>
                <p className="mt-1 capitalize">Availability: {selectedArtwork.availability}</p>
              </div>
            ) : null}

            <Button variant="outline" className="text-destructive-foreground" disabled={busy} onClick={() => void removeSelected()}>
              <Trash2 className="size-3.5" /> Remove from gallery
            </Button>
          </div>
        ) : (
          <p className="pt-3 text-caption text-muted-foreground">Add an artwork, or select one already placed, to edit its position, rotation, wall, and frame.</p>
        )}

        {error ? <p className="mt-3 text-caption text-destructive-foreground">{error}</p> : null}
        {savedMessage ? <p className="mt-3 text-caption text-primary">{savedMessage}</p> : null}
        <p className="mt-3 border-t border-border pt-3 text-caption text-muted-foreground">
          {placements.length + placedUploadedImages.length} artwork{placements.length + placedUploadedImages.length === 1 ? "" : "s"} placed
        </p>
      </aside>
    </div>
  );
}
