"use client";
// FR-47/FR-48: single-document picker used for (a) the technical valuation
// report on the car listing form and (b) the OPTIONAL legal rental licence
// on the sign-up form. Same proven pattern as PhotoPicker: the file is
// resized IN THE BROWSER (long edge 1280px, JPEG q0.82) before it becomes a
// data URL, so the server action stays far under its body limit. The value
// travels in a hidden input with the given name, which the server actions
// read via formData.get().
import { useRef, useState, type ChangeEvent } from "react";
import { FileImage, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const MAX_EDGE = 1280; // px — longest side after browser resize
const JPEG_QUALITY = 0.82;
const MAX_FILE_MB = 8;

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

export function DocPicker({
  name,
  label,
  description,
  required = false,
  initial = null,
}: {
  name: string;
  label: string;
  description: string;
  required?: boolean;
  initial?: string | null;
}) {
  const [doc, setDoc] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file after a remove
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file — a photo or scan of the document (JPG or PNG).");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_FILE_MB} MB — pick a smaller image.`);
      return;
    }
    setBusy(true);
    try {
      setDoc(await fileToResizedDataUrl(file));
    } catch {
      setError("Could not read that file — try a JPG or PNG image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <Label htmlFor={`${name}-btn`}>
        {label}{" "}
        <span className={required ? "font-medium text-red-600" : "font-normal text-muted-foreground"}>
          ({required ? "required" : "optional"})
        </span>
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>

      {doc && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doc}
            alt={`${label} preview`}
            className="h-20 w-28 cursor-zoom-in rounded-md border object-cover"
            onClick={() => window.open(doc, "_blank", "noopener")}
          />
          <div className="min-w-0 flex-1 text-xs">
            <p className="flex items-center gap-1 font-medium text-green-700">
              <FileImage className="h-3.5 w-3.5" aria-hidden /> Document attached — it will be stored with the
              {required ? " listing" : " account"}.
            </p>
            <p className="text-muted-foreground">Click the image to view it full size.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setDoc(null)} aria-label={`Remove ${label}`}>
            <X className="mr-1 h-3.5 w-3.5" aria-hidden /> Remove
          </Button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChosen} disabled={busy} />
      {!doc && (
        <Button type="button" id={`${name}-btn`} variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <FileImage className="mr-1.5 h-4 w-4" aria-hidden />}
          {busy ? "Processing…" : "Upload photo or scan"}
        </Button>
      )}
      {required && !doc && <p className="text-xs text-red-600">This document is required before you can submit.</p>}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {doc && <input type="hidden" name={name} value={doc} />}
    </div>
  );
}
