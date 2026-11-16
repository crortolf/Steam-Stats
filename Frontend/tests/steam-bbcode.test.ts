import { describe, it, expect } from "vitest";
import {
  parseBBCode,
  stripBBCode,
  firstImage,
  safeUrl,
  type BBElement,
} from "@/lib/steam-bbcode";

describe("parseBBCode", () => {
  it("returns plain text as a single string node", () => {
    expect(parseBBCode("hello world")).toEqual(["hello world"]);
  });

  it("nests tags and keeps the text around them", () => {
    expect(parseBBCode("a [b]bold [i]both[/i][/b] c")).toEqual([
      "a ",
      {
        tag: "b",
        attrs: {},
        children: ["bold ", { tag: "i", attrs: {}, children: ["both"] }],
      },
      " c",
    ]);
  });

  it("reads tag names case-insensitively", () => {
    const [node] = parseBBCode("[B]x[/B]") as BBElement[];
    expect(node.tag).toBe("b");
  });

  it("leaves unknown bracketed text alone", () => {
    expect(parseBBCode("[Bug fix] crash on start")).toEqual(["[Bug fix] crash on start"]);
  });

  it("reads the main value and named attributes", () => {
    const [url] = parseBBCode('[url="https://a.com"]a[/url]') as BBElement[];
    expect(url.attrs).toEqual({ value: "https://a.com" });

    const [video] = parseBBCode('[video mp4="a.mp4" webm=b.webm][/video]') as BBElement[];
    expect(video.attrs).toEqual({ mp4: "a.mp4", webm: "b.webm" });
  });

  it("ends an unclosed list item when the next one starts", () => {
    const [list] = parseBBCode("[list][*]one[*]two[/list]") as BBElement[];
    expect(list.children).toEqual([
      { tag: "*", attrs: {}, children: ["one"] },
      { tag: "*", attrs: {}, children: ["two"] },
    ]);
  });

  it("closes tags left open inside a closing tag and drops stray closers", () => {
    expect(parseBBCode("[b][i]x[/b] y[/u]")).toEqual([
      { tag: "b", attrs: {}, children: [{ tag: "i", attrs: {}, children: ["x"] }] },
      " y",
    ]);
  });

  it("treats [hr] as self closing", () => {
    expect(parseBBCode("a[hr]b")).toEqual(["a", { tag: "hr", attrs: {}, children: [] }, "b"]);
  });
});

describe("stripBBCode", () => {
  it("removes markup and collapses whitespace", () => {
    expect(stripBBCode("[h1]Patch[/h1]\n\n[list][*]Fixed  crash[/list]")).toBe(
      "Patch Fixed crash",
    );
  });

  it("leaves out images and keeps words around tags apart", () => {
    expect(stripBBCode("before[img]https://a.com/x.png[/img]after")).toBe("before after");
    expect(stripBBCode("[b]one[/b][i]two[/i]")).toBe("one two");
  });
});

describe("firstImage", () => {
  it("finds images in each of steam's three forms", () => {
    expect(firstImage('[img src="https://a.com/1.png"][/img]')).toBe("https://a.com/1.png");
    expect(firstImage("[img=https://a.com/2.png]")).toBe("https://a.com/2.png");
    expect(firstImage("[img]https://a.com/3.png[/img]")).toBe("https://a.com/3.png");
  });

  it("searches inside other tags and skips unusable images", () => {
    expect(
      firstImage("[p][img]javascript:alert(1)[/img][b][img]https://a.com/ok.png[/img][/b][/p]"),
    ).toBe("https://a.com/ok.png");
  });

  it("returns null when there are no images", () => {
    expect(firstImage("[b]text only[/b]")).toBeNull();
  });
});

describe("safeUrl", () => {
  it("allows http and https links", () => {
    expect(safeUrl("https://store.steampowered.com")).toBe("https://store.steampowered.com/");
    expect(safeUrl(" http://a.com/x ")).toBe("http://a.com/x");
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "not a url", "", undefined])(
    "rejects %p",
    (raw) => {
      expect(safeUrl(raw)).toBeNull();
    },
  );

  it("fills in steam's clan image placeholder", () => {
    expect(safeUrl("{STEAM_CLAN_IMAGE}/123/abc.png")).toBe(
      "https://clan.akamai.steamstatic.com/images/123/abc.png",
    );
    expect(safeUrl("{STEAM_CLAN_LOC_IMAGE}/1.png")).toBe(
      "https://clan.akamai.steamstatic.com/images/1.png",
    );
  });
});
