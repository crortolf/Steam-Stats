"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationImage } from "@/lib/types";
import { apiErrorMessage, imageUrl, recommendationsApi } from "./api";

// Keep in step with recommendationImagesController.js. The server checks the
// file's real contents too; this only gives quick feedback.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type Uploading = { key: string; preview: string };

/**
 * Uploads images as soon as they're picked and shows them as removable
 * thumbnails. `images` holds the finished uploads; their ids are sent with
 * the recommendation when it's posted.
 */
export function ImageUploader({
  images,
  onChange,
  max,
  label,
  onBusyChange,
  compact = false,
}: {
  images: RecommendationImage[];
  onChange: (images: RecommendationImage[]) => void;
  max: number;
  label: string;
  /** True while any upload is still in progress. */
  onBusyChange: (busy: boolean) => void;
  compact?: boolean;
}) {
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  // Always the latest images, since uploads finish after re-renders.
  const latest = useRef(images);
  latest.current = images;

  // Kept in a ref so callers can pass an inline function without the effect
  // below re-running every render.
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const busy = uploading.length > 0;
  useEffect(() => {
    busyCallback.current(busy);
  }, [busy]);
  // Removing an uploader mid-upload (e.g. un-highlighting) mustn't leave the
  // form thinking an upload is still running.
  useEffect(() => () => busyCallback.current(false), []);

  const room = max - images.length - uploading.length;

  async function uploadFiles(files: File[]) {
    setError(null);
    const accepted = files.slice(0, Math.max(0, room));
    if (files.length > accepted.length) {
      setError(`You can add up to ${max} image${max === 1 ? "" : "s"} here.`);
    }

    await Promise.all(
      accepted.map(async (file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Use PNG, JPEG, WebP or GIF images.");
          return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setError("Images can be up to 5 MB.");
          return;
        }
        const entry = {
          key: `${file.name}-${file.size}-${Math.random()}`,
          preview: URL.createObjectURL(file),
        };
        setUploading((u) => [...u, entry]);
        try {
          const form = new FormData();
          form.append("image", file);
          const res = await recommendationsApi.post<RecommendationImage>(
            "/images",
            form,
          );
          // Update the ref too, so two uploads finishing before the next
          // render don't overwrite each other.
          latest.current = [...latest.current, res.data];
          onChange(latest.current);
        } catch (err) {
          setError(apiErrorMessage(err, "Couldn't upload that image."));
        } finally {
          URL.revokeObjectURL(entry.preview);
          setUploading((u) => u.filter((x) => x.key !== entry.key));
        }
      }),
    );
  }

  function remove(id: string) {
    latest.current = latest.current.filter((img) => img.id !== id);
    onChange(latest.current);
    // Not in a post yet, so the server can drop it now (it would expire anyway).
    recommendationsApi.delete(`/images/${id}`).catch(() => {});
  }

  const thumb = compact ? "size-16" : "size-24";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {images.map((img) => (
          <div key={img.id} className={cn("relative shrink-0", thumb)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(img.id)}
              alt=""
              className="size-full rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => remove(img.id)}
              aria-label="Remove image"
              className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-border bg-popover text-muted-foreground shadow hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {uploading.map((u) => (
          <div key={u.key} className={cn("relative shrink-0", thumb)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u.preview}
              alt=""
              className="size-full rounded-md border border-border object-cover opacity-50"
            />
            <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-foreground" />
          </div>
        ))}
        {room > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground",
              thumb,
            )}
          >
            <ImagePlus className="size-5" />
            {!compact && <span>Add image</span>}
            <span className="sr-only">{label}</span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple={room > 1}
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = ""; // so picking the same file again still fires
            if (files.length) uploadFiles(files);
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
