import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortChips } from "@/components/sort-chips";

const options = [
  { key: "name", label: "Name" },
  { key: "playtime", label: "Playtime" },
  { key: "recent", label: "Recent" },
] as const;

type Key = (typeof options)[number]["key"];

//jsdom has no matchMedia or element.animate, which the chip animation uses
beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
  HTMLElement.prototype.animate = vi.fn() as never;
});

const renderChips = (props: Partial<Parameters<typeof SortChips<Key>>[0]> = {}) => {
  const onSelect = vi.fn();
  const utils = render(
    <SortChips<Key>
      options={options}
      activeKey="playtime"
      direction="desc"
      onSelect={onSelect}
      ariaLabel="Sort games"
      {...props}
    />,
  );
  return { onSelect, ...utils };
};

describe("SortChips", () => {
  it("puts the active chip first and keeps the rest in order", () => {
    renderChips();
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["Playtime", "Name", "Recent"]);
  });

  it("marks only the active chip as pressed", () => {
    renderChips();
    expect(screen.getByRole("button", { name: "Playtime" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Name" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSelect with the clicked chip's key", async () => {
    const { onSelect } = renderChips();
    await userEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(onSelect).toHaveBeenCalledWith("recent");
  });

  it("describes the current order on the active chip", () => {
    renderChips({ describe: (key, dir) => `${key} ${dir}` });
    expect(screen.getByRole("button", { name: "Playtime" })).toHaveAttribute(
      "title",
      "playtime desc. Click to reverse.",
    );
    expect(screen.getByRole("button", { name: "Name" })).toHaveAttribute("title", "Sort by name");
  });

  it("is labelled for screen readers", () => {
    renderChips();
    expect(screen.getByRole("group", { name: "Sort games" })).toBeInTheDocument();
  });

  it("moves a newly picked chip to the front", () => {
    const { rerender, onSelect } = renderChips();
    rerender(
      <SortChips<Key>
        options={options}
        activeKey="recent"
        direction="asc"
        onSelect={onSelect}
        ariaLabel="Sort games"
      />,
    );
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("Recent");
  });
});
