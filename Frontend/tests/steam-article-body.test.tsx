import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SteamArticleBody } from "@/components/steam-article-body";

const renderArticle = (contents: string) => render(<SteamArticleBody contents={contents} />);

describe("SteamArticleBody", () => {
  it("renders formatting tags as HTML elements", () => {
    const { container } = renderArticle("[h1]Update[/h1][b]bold[/b] and [i]italic[/i]");

    //h1 is shown one level down so it sits under the dialog's own title
    expect(screen.getByRole("heading", { level: 3, name: "Update" })).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
  });

  it("renders lists", () => {
    renderArticle("[list][*]First fix[*]Second fix[/list]");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "First fix",
      "Second fix",
    ]);
  });

  it("opens safe links in a new tab", () => {
    renderArticle('[url="https://store.steampowered.com"]Store page[/url]');
    const link = screen.getByRole("link", { name: "Store page" });
    expect(link).toHaveAttribute("href", "https://store.steampowered.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows unsafe links as plain text", () => {
    renderArticle('[url="javascript:alert(1)"]Click me[/url]');
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("shows HTML in the article as text instead of running it", () => {
    const { container } = renderArticle('<img src=x onerror="alert(1)"> hi');
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent('<img src=x onerror="alert(1)"> hi');
  });

  it("renders images and drops ones with unusable addresses", () => {
    const { container } = renderArticle(
      "[img]{STEAM_CLAN_IMAGE}/1/a.png[/img][img]javascript:alert(1)[/img]",
    );
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "https://clan.akamai.steamstatic.com/images/1/a.png");
  });

  it("turns a youtube preview into a link", () => {
    renderArticle('[previewyoutube="dQw4w9WgXcQ;full"][/previewyoutube]');
    expect(screen.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("hides spoilers behind a summary", () => {
    const { container } = renderArticle("[spoiler]the ending[/spoiler]");
    expect(container.querySelector("details summary")).toHaveTextContent("Spoiler");
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });
});
