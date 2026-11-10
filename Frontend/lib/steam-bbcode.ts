//parses the BBCode markup steam uses in news articles into a tree of nodes
export type BBNode = string | BBElement;

export type BBElement = {
  tag: string;
  attrs: Record<string, string>;
  children: BBNode[];
};

//anything else in square brackets stays as text, ex: "[Bug fix]" in a patch note
const KNOWN_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "b",
  "i",
  "u",
  "strike",
  "url",
  "dynamiclink",
  "img",
  "video",
  "previewyoutube",
  "list",
  "olist",
  "*",
  "quote",
  "code",
  "c",
  "hr",
  "spoiler",
  "expand",
  "table",
  "tr",
  "th",
  "td",
  "center",
  "carousel",
]);

const TAG_PATTERN = /\[(\/?)([a-zA-Z0-9]+|\*)((?:[= ][^\]]*)?)\]/g;
const ATTR_PATTERN = /([a-zA-Z_]+)=(?:"([^"]*)"|(\S*))/g;
const FIRST_VALUE_PATTERN = /^=(?:"([^"]*)"|(\S*))/;

//the main value of [url="x"] is stored as attrs.value, named ones as attrs.name
const parseAttrs = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const first = raw.match(FIRST_VALUE_PATTERN);
  if (first) attrs.value = first[1] ?? first[2] ?? "";
  const rest = first ? raw.slice(first[0].length) : raw;
  for (const match of rest.matchAll(ATTR_PATTERN)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return attrs;
};

export const parseBBCode = (source: string): BBNode[] => {
  const root: BBElement = { tag: "root", attrs: {}, children: [] };
  const stack: BBElement[] = [root];
  const top = () => stack[stack.length - 1];
  let position = 0;

  for (const match of source.matchAll(TAG_PATTERN)) {
    const [token, slash, rawTag, rawAttrs] = match;
    const tag = rawTag.toLowerCase();
    if (!KNOWN_TAGS.has(tag)) continue;

    if (match.index > position) {
      top().children.push(source.slice(position, match.index));
    }
    position = match.index + token.length;

    if (slash) {
      //closes this tag and anything left open inside it, stray closers are dropped
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    //steam doesn't always close list items, so a new item ends the previous one
    if (tag === "*") {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === "list" || stack[i].tag === "olist") break;
        if (stack[i].tag === "*") {
          stack.length = i;
          break;
        }
      }
    }

    const element: BBElement = {
      tag,
      attrs: parseAttrs(rawAttrs),
      children: [],
    };
    top().children.push(element);
    if (tag !== "hr") stack.push(element);
  }

  if (position < source.length) top().children.push(source.slice(position));
  return root.children;
};

export const nodesToText = (nodes: BBNode[]): string =>
  nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (node.tag === "img" || node.tag === "video") return " ";
      if (node.tag === "previewyoutube") return " ";
      return ` ${nodesToText(node.children)} `;
    })
    .join("");

//plain text version of an article, used for the blurb on the news card
export const stripBBCode = (source: string): string =>
  nodesToText(parseBBCode(source)).replace(/\s+/g, " ").trim();

//address of the first usable image in a tree of nodes, null if there isn't one
const findImage = (nodes: BBNode[]): string | null => {
  for (const node of nodes) {
    if (typeof node === "string") continue;
    const url =
      node.tag === "img"
        ? imageUrl(node)
        : findImage(node.children);
    if (url !== null) return url;
  }
  return null;
};

//the address is in [img src="x"], [img=x] or [img]x[/img] depending on the article
export const imageUrl = (element: BBElement): string | null =>
  safeUrl(element.attrs.src ?? element.attrs.value ?? nodesToText(element.children));

export const firstImage = (source: string): string | null =>
  findImage(parseBBCode(source));

//fills in steam's image placeholder, returns null for anything but http(s) links
export const safeUrl = (raw: string | undefined): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(
      raw
        .trim()
        .replace(
          /\{STEAM_CLAN(?:_LOC)?_IMAGE\}/g,
          "https://clan.akamai.steamstatic.com/images",
        ),
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};
