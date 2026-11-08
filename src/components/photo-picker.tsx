"use client";
// FR-34 (v2): the owner adds up to 5 real photos — uploaded from the device or
// pasted as an https image link. Device photos are resized IN THE BROWSER
// (long edge 1280px, JPEG q0.82) before they become data URLs, so a 4 MB phone
// shot lands at ~300 KB and the server action stays far under its body limit.
// The first photo is the cover; duplicates are skipped; everything is
// removable before submit. Hidden inputs named "photos" keep the exact same
// contract the create/update car actions already read via formData.getAll().
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ImagePlus, Link2, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const MAX_PHOTOS = 5;
const MAX_EDGE = 1280; // px — longest side after browser resize
const JPEG_QUALITY = 0.82;
const MAX_FILE_MB = 10; // reject absurd inputs before touching the canvas

// Decode + downscale any browser-supported image to a compact JPEG data URL.
async function fileToResizedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas unsupported");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!out.startsWith("data:image/jpeg;base64,")) throw new Error("encode failed");
  return out;
}

// An "online link" must be a real https image URL — mixed-content http links
// would be blocked by the CSP anyway, so we reject them with a clear message.
function isHttpsImage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function PhotoPicker({ initial = [] }: { initial?: string[] }) {
  const [photos, setPhotos] = useState<string[]>(initial);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const full = photos.length >= MAX_PHOTOS;
  const locked = full || busy;

  function add(items: string[]) {
    const merged = [...photos];
    let dupes = 0;
    for (const p of items) {
      if (merged.length >= MAX_PHOTOS) break;
      if (merged.includes(p)) {
        dupes++;
        continue;
      }
      merged.push(p);
    }
    setPhotos(merged);
    if (dupes > 0) setError(`${dupes} duplicate photo${dupes > 1 ? "s were" : " was"} skipped.`);
  }

  async function onFilesChosen(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    setError(null);
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`You already have ${MAX_PHOTOS} photos — remove one first.`);
      e.target.value = "";
      return;
    }
    setBusy(true);
    const out: string[] = [];
    let notice: string | null = null;
    try {
      for (const file of Array.from(files)) {
        if (out.length === room) {
          notice = `Only ${room} more photo${room > 1 ? "s" : ""} allowed — extra files were ignored.`;
          break;
        }
        if (!file.type.startsWith("image/")) {
          notice = `"${file.name}" is not an image file.`;
          continue;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          notice = `"${file.name}" is over ${MAX_FILE_MB} MB — pick a smaller photo.`;
          continue;
        }
        try {
          out.push(await fileToResizedDataUrl(file));
        } catch {
          notice = `Could not read "${file.name}" — please use a JPG or PNG photo.`;
        }
      }
    } finally {
      setBusy(false);
      e.target.value = "";
    }
    if (out.length > 0) add(out);
    if (notice) setError(notice);
  }

  function addLink() {
    setError(null);
    const value = link.trim();
    if (!value) return;
    if (!isHttpsImage(value)) {
      setError("Enter a valid image link starting with https://");
      return;
    }
    add([value]);
    setLink("");
  }

  function onLinkKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // Enter inside the form must add the link, not submit
      addLink();
    }
  }

  function removeAt(i: number) {
    setPhotos((prev) => prev.filter((_, j) => j !== i));
    setError(null);
  }

  return (
    <div className="space-y-2">
      <Label>Photos — upload from your device or paste an online link (max {MAX_PHOTOS})</Label>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p, i) => (
            <li key={p} className="group relative aspect-[4/3] overflow-hidden rounded-md border">
              <img src={p} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                  <Star className="h-3 w-3 text-amber-500" aria-hidden /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow-sm transition hover:bg-red-600 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFilesChosen}
          disabled={locked}
        />
        <Button type="button" variant="outline" size="sm" disabled={locked} onClick={() => fileRef.current?.click()}>
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden />
          )}
          {busy ? "Processing…" : "Upload from device"}
        </Button>
        <div className="flex min-w-[220px] flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={onLinkKeyDown}
              placeholder="https://… image link"
              className="pl-8"
              disabled={locked}
              aria-label="Image link"
            />
          </div>
          <Button type="button" variant="outline" size="sm" disabled={locked || !link.trim()} onClick={addLink}>
            Add link
          </Button>
        </div>
      </div>

      <p className={error ? "text-xs text-red-600" : "text-xs text-muted-foreground"} role={error ? "alert" : undefined}>
        {error ??
          `${photos.length} / ${MAX_PHOTOS} photos · the first photo is the cover · device photos are resized automatically`}
      </p>
      {photos.length === 0 && <p className="text-xs text-red-600">Add at least one photo.</p>}

      {photos.map((p) => (
        <input key={p} type="hidden" name="photos" value={p} />
      ))}
    </div>
  );
}
