import { cn } from "@/lib/utils";
import type { RecommendationImage } from "@/lib/types";
import { imageUrl } from "./api";

/**
 * A post's images. One image shows at its own shape; several share a grid.
 * Each opens full size in a new tab.
 */
export function ImageGallery({
  images,
  small = false,
}: {
  images: RecommendationImage[];
  /** Thumbnails, for images attached to a highlighted achievement. */
  small?: boolean;
}) {
  if (images.length === 0) return null;

  if (small) {
    return (
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <a
            key={img.id}
            href={imageUrl(img.id)}
            target="_blank"
            rel="noreferrer"
            className="block size-20 overflow-hidden rounded-md border border-border hover:border-primary/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(img.id)}
              alt=""
              loading="lazy"
              width={img.width}
              height={img.height}
              className="size-full object-cover"
            />
          </a>
        ))}
      </div>
    );
  }

  const single = images.length === 1;
  return (
    <div className={cn("grid gap-2", single ? "grid-cols-1" : "grid-cols-2")}>
      {images.map((img, i) => (
        <a
          key={img.id}
          href={imageUrl(img.id)}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "block overflow-hidden rounded-lg border border-border bg-secondary/30 hover:border-primary/50",
            // Three images: the first spans the top row.
            images.length === 3 && i === 0 && "col-span-2",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(img.id)}
            alt=""
            loading="lazy"
            width={img.width}
            height={img.height}
            className={cn(
              "w-full",
              single
                ? "h-auto max-h-[28rem] object-contain"
                : "aspect-video object-cover",
            )}
          />
        </a>
      ))}
    </div>
  );
}
