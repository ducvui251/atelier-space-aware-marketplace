// `<model-viewer>` (@google/model-viewer) is a plain custom element with no
// official React/JSX type augmentation shipped — this declares just the
// attributes ArtworkArViewer.tsx actually uses. Augments the 'react' JSX
// namespace directly (same pattern @react-three/fiber's own types use),
// since this project's React 19 setup resolves JSX.IntrinsicElements there
// rather than off a bare global `JSX` namespace.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

interface ModelViewerElementProps extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  src?: string;
  alt?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  exposure?: string;
  "shadow-intensity"?: string;
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "interaction" | "manual";
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerElementProps;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerElementProps;
    }
  }
}

export {};
