/**
 * An SVG filter that turns whatever it's applied to into blocks of `size`
 * pixels: one pixel per block is kept, then grown to fill the block. Used to
 * hide flagged players' avatars. Use it with filter="url(#id)" inside an
 * <svg>, or style={{ filter: "url(#id)" }} on an HTML element.
 * Rendering-only, so it works on cross-origin images.
 */
export function PixelateFilter({ id, size }: { id: string; size: number }) {
  const dot = Math.max(1, Math.round(size / 5));
  const start = Math.floor((size - dot) / 2);
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feFlood x={start} y={start} width={dot} height={dot} />
      <feComposite width={size} height={size} />
      <feTile result="grid" />
      <feComposite in="SourceGraphic" in2="grid" operator="in" />
      <feMorphology operator="dilate" radius={size / 2} />
    </filter>
  );
}

/** Renders the filter in a hidden <svg> so HTML elements can reference it. */
export function PixelateFilterDefs({ id, size }: { id: string; size: number }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <PixelateFilter id={id} size={size} />
      </defs>
    </svg>
  );
}
