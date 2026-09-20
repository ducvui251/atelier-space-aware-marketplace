"use client";

import { useState } from "react";
import { ExhibitionEditorV2 } from "@/components/exhibition-editor-v2/ExhibitionEditorV2";
import { ExhibitionCreationStudio } from "./ExhibitionCreationStudio";

type ExhibitionWorkspaceMode = "premade" | "custom";

export function ExhibitionWorkspace({
  id,
}: {
  id: string | null;
}) {
  const [mode, setMode] = useState<ExhibitionWorkspaceMode>("custom");

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="eyebrow">Exhibition Studio</p>
          <h1 className="mt-2 font-display text-h3 text-foreground">{id ? "Define your exhibition space" : "Start a new exhibition"}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
            {id
              ? "Edit the exhibition space with the unified Define Space editor."
              : mode === "custom"
                ? "Custom floor plan selected. Create the draft to open Define Space V2."
                : "Pre-made room selected. Create the draft to open the 10 × 10 m room."}
          </p>
        </div>
        {id ? null : (
          <div className="grid grid-cols-2 rounded-md border border-border bg-muted p-1" role="tablist" aria-label="Exhibition space mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "premade"}
              className={`rounded px-3 py-2 text-caption transition-colors ${mode === "premade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("premade")}
            >
              Select Pre-made
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "custom"}
              className={`rounded px-3 py-2 text-caption transition-colors ${mode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("custom")}
            >
              Create Custom
            </button>
          </div>
        )}
      </div>

      {id ? (
        <ExhibitionEditorV2 id={id} />
      ) : (
        <ExhibitionCreationStudio mode={mode} />
      )}
    </div>
  );
}
