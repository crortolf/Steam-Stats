import type { ReactNode } from "react";
import {
  BBElement,
  BBNode,
  imageUrl,
  nodesToText,
  parseBBCode,
  safeUrl,
} from "@/lib/steam-bbcode";

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "list",
  "olist",
  "*",
  "quote",
  "code",
  "hr",
  "spoiler",
  "expand",
  "table",
  "tr",
  "th",
  "td",
  "center",
  "carousel",
  "img",
  "video",
  "previewyoutube",
]);

const isBlock = (node: BBNode | undefined) =>
  node === undefined || (typeof node !== "string" && BLOCK_TAGS.has(node.tag));

const linkClass = "text-primary underline underline-offset-2 hover:opacity-80";

const renderNodes = (nodes: BBNode[]): ReactNode[] =>
  nodes.map((node, index) => {
    if (typeof node !== "string") return renderElement(node, index);
    //line breaks next to a block element would show up as blank lines
    let text = node;
    if (isBlock(nodes[index - 1])) text = text.trimStart();
    if (isBlock(nodes[index + 1])) text = text.trimEnd();
    return text;
  });

const renderLink = (element: BBElement, key: number, href: string | undefined) => {
  const url = safeUrl(href ?? nodesToText(element.children));
  const children = element.children.length
    ? renderNodes(element.children)
    : url ?? href;
  if (url === null) return <span key={key}>{children}</span>;
  return (
    <a
      key={key}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );
};

const renderElement = (element: BBElement, key: number): ReactNode => {
  const { tag, attrs } = element;
  const children = renderNodes(element.children);

  switch (tag) {
    case "p":
      return (
        <p key={key} className="my-3">
          {children}
        </p>
      );
    case "h1":
      return (
        <h3 key={key} className="mb-2 mt-6 text-xl font-bold text-foreground">
          {children}
        </h3>
      );
    case "h2":
      return (
        <h4 key={key} className="mb-2 mt-5 text-lg font-bold text-foreground">
          {children}
        </h4>
      );
    case "h3":
      return (
        <h5 key={key} className="mb-2 mt-4 font-bold text-foreground">
          {children}
        </h5>
      );
    case "b":
      return (
        <strong key={key} className="font-bold text-foreground">
          {children}
        </strong>
      );
    case "i":
      return <em key={key}>{children}</em>;
    case "u":
      return <u key={key}>{children}</u>;
    case "strike":
      return <s key={key}>{children}</s>;
    case "url":
      return renderLink(element, key, attrs.value);
    case "dynamiclink":
      return renderLink(element, key, attrs.href ?? attrs.value);
    case "img": {
      const src = imageUrl(element);
      if (src === null) return null;
      return (
        // article images have unknown sizes, which next/image needs up front
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={src}
          alt=""
          loading="lazy"
          className="my-3 h-auto max-w-full rounded-md"
        />
      );
    }
    case "video": {
      const mp4 = safeUrl(attrs.mp4);
      const webm = safeUrl(attrs.webm);
      if (mp4 === null && webm === null) return null;
      return (
        <video
          key={key}
          controls
          preload="none"
          poster={safeUrl(attrs.poster) ?? undefined}
          className="my-3 h-auto max-w-full rounded-md"
        >
          {webm && <source src={webm} type="video/webm" />}
          {mp4 && <source src={mp4} type="video/mp4" />}
        </video>
      );
    }
    case "previewyoutube": {
      const videoId = (attrs.value ?? "").split(";")[0];
      if (!videoId) return null;
      return (
        <p key={key} className="my-3">
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Watch on YouTube
          </a>
        </p>
      );
    }
    case "list":
      return (
        <ul key={key} className="my-3 list-disc space-y-1 pl-6">
          {children}
        </ul>
      );
    case "olist":
      return (
        <ol key={key} className="my-3 list-decimal space-y-1 pl-6">
          {children}
        </ol>
      );
    case "*":
      return <li key={key}>{children}</li>;
    case "quote":
      return (
        <blockquote
          key={key}
          className="my-3 border-l-2 border-primary/50 pl-4 italic"
        >
          {attrs.value && (
            <p className="mb-1 text-xs not-italic">{attrs.value} said:</p>
          )}
          {children}
        </blockquote>
      );
    case "code":
      return (
        <pre
          key={key}
          className="my-3 overflow-x-auto rounded-md bg-black/30 p-3 text-xs"
        >
          <code>{nodesToText(element.children)}</code>
        </pre>
      );
    case "c":
      return (
        <code key={key} className="rounded bg-black/30 px-1 py-0.5 text-xs">
          {nodesToText(element.children)}
        </code>
      );
    case "hr":
      return <hr key={key} className="my-4 border-border" />;
    case "spoiler":
    case "expand":
      return (
        <details key={key} className="my-3">
          <summary className="cursor-pointer text-primary">
            {tag === "spoiler" ? "Spoiler" : "Show more"}
          </summary>
          {children}
        </details>
      );
    case "table":
      return (
        <div key={key} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "tr":
      return <tr key={key}>{children}</tr>;
    case "th":
      return (
        <th key={key} className="border border-border p-2 font-semibold">
          {children}
        </th>
      );
    case "td":
      return (
        <td key={key} className="border border-border p-2">
          {children}
        </td>
      );
    default:
      return <div key={key}>{children}</div>;
  }
};

/**
 * Renders a Steam news article's BBCode as formatted HTML: headings, lists,
 * links, images, videos, quotes, spoilers and tables. React escapes all of the
 * text, so any HTML in an article shows as plain text, and only http(s) links
 * and images are used.
 */
export function SteamArticleBody({ contents }: { contents: string }) {
  return (
    <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
      {renderNodes(parseBBCode(contents))}
    </div>
  );
}
