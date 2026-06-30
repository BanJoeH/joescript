import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Area = {
  id: string;
  name: string;
  sortOrder: number;
};

export function AreaList({ areas: initialAreas }: { areas: Area[] }) {
  const [areas, setAreas] = useState(initialAreas);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fetcher = useFetcher();
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    setAreas(initialAreas);
  }, [initialAreas]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && "updated" in fetcher.data) {
      setEditingId(null);
      setEditName("");
    }
  }, [fetcher.state, fetcher.data]);

  function persistOrder(nextAreas: Area[]) {
    const formData = new FormData();
    formData.set("intent", "reorder");
    formData.set("order", JSON.stringify(nextAreas.map((area) => area.id)));
    fetcher.submit(formData, { method: "post" });
  }

  function moveItem(fromId: string, toId: string) {
    const fromIndex = areas.findIndex((area) => area.id === fromId);
    const toIndex = areas.findIndex((area) => area.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    const next = [...areas];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setAreas(next);
    persistOrder(next);
  }

  function startEditing(area: Area) {
    setEditingId(area.id);
    setEditName(area.name);
  }

  function saveEdit(areaId: string) {
    const formData = new FormData();
    formData.set("intent", "update");
    formData.set("id", areaId);
    formData.set("name", editName);
    fetcher.submit(formData, { method: "post" });
  }

  function deleteArea(area: Area) {
    if (!confirm(`Delete "${area.name}"? Areas with plants cannot be deleted.`)) {
      return;
    }

    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("id", area.id);
    fetcher.submit(formData, { method: "post" });
  }

  const error =
    fetcher.data && typeof fetcher.data === "object" && "error" in fetcher.data
      ? String(fetcher.data.error)
      : null;

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {areas.map((area) => {
          const isEditing = editingId === area.id;

          return (
            <li
              key={area.id}
              className={cn(
                "flex items-center gap-3 rounded-md border bg-card px-3 py-3 transition-colors",
                dragOverId === area.id &&
                  draggedId.current !== area.id &&
                  !isEditing &&
                  "border-primary/50 bg-accent/50",
                fetcher.state !== "idle" && "opacity-80",
              )}
              draggable={!isEditing}
              onDragEnd={() => {
                draggedId.current = null;
                setDragOverId(null);
              }}
              onDragLeave={() => {
                if (dragOverId === area.id) {
                  setDragOverId(null);
                }
              }}
              onDragOver={(event) => {
                if (isEditing) return;
                event.preventDefault();
                if (draggedId.current && draggedId.current !== area.id) {
                  setDragOverId(area.id);
                }
              }}
              onDragStart={() => {
                if (isEditing) return;
                draggedId.current = area.id;
              }}
              onDrop={(event) => {
                if (isEditing) return;
                event.preventDefault();
                if (draggedId.current) {
                  moveItem(draggedId.current, area.id);
                }
                draggedId.current = null;
                setDragOverId(null);
              }}
            >
              <GripVertical
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground",
                  isEditing ? "opacity-30" : "cursor-grab active:cursor-grabbing",
                )}
              />
              {isEditing ? (
                <>
                  <Input
                    className="flex-1"
                    onChange={(event) => setEditName(event.target.value)}
                    value={editName}
                  />
                  <Button
                    disabled={!editName.trim() || fetcher.state !== "idle"}
                    onClick={() => saveEdit(area.id)}
                    size="sm"
                    type="button"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => setEditingId(null)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{area.name}</span>
                  <Button
                    aria-label={`Edit ${area.name}`}
                    onClick={() => startEditing(area)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${area.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteArea(area)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
