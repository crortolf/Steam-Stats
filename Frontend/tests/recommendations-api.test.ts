import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { apiErrorMessage, imageUrl } from "@/components/recommendations/api";
import { cn } from "@/lib/utils";

//an error shaped like the one axios throws for a failed response
const responseError = (data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("apiErrorMessage", () => {
  it("uses the message the backend sent", () => {
    expect(apiErrorMessage(responseError({ error: "Choose a game." }), "fallback")).toBe(
      "Choose a game.",
    );
  });

  it("falls back when the response has no message", () => {
    expect(apiErrorMessage(responseError({}), "fallback")).toBe("fallback");
  });

  it("falls back for errors that aren't from axios", () => {
    expect(apiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    expect(apiErrorMessage("nope", "fallback")).toBe("fallback");
  });
});

describe("imageUrl", () => {
  it("points at the backend's image route", () => {
    expect(imageUrl("abc123")).toBe("http://localhost:5011/recommendations/images/abc123");
  });
});

describe("cn", () => {
  it("joins classes, skips falsy ones and lets later tailwind classes win", () => {
    expect(cn("px-2", false && "hidden", null, "px-4", "text-sm")).toBe("px-4 text-sm");
  });
});
