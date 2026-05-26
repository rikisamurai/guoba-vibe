import { describe, it, expect } from "vitest";
import { parseUrl } from "@/lib/url-parse";

describe("parseUrl", () => {
  it("parses xhsdiscover deep link with query", () => {
    const r = parseUrl("xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2");
    expect(r.isValid).toBe(true);
    expect(r.scheme).toBe("xhsdiscover");
    expect(r.path).toBe("rn/wakanda/buyer-conversion");
    expect(r.query).toEqual({ sku_id: "1", item_id: "2" });
  });

  it("parses https url", () => {
    const r = parseUrl("https://example.com/foo/bar?x=1");
    expect(r.isValid).toBe(true);
    expect(r.scheme).toBe("https");
    expect(r.path).toBe("example.com/foo/bar");
    expect(r.query).toEqual({ x: "1" });
  });

  it("parses url with no query", () => {
    const r = parseUrl("xhsdiscover://rn/wakanda/buyer-conversion");
    expect(r.path).toBe("rn/wakanda/buyer-conversion");
    expect(r.query).toEqual({});
  });

  it("parses url with empty query value", () => {
    const r = parseUrl("https://a.com/p?k=");
    expect(r.query).toEqual({ k: "" });
  });

  it("preserves repeated query keys by last-write", () => {
    const r = parseUrl("https://a.com/?k=1&k=2");
    expect(r.query).toEqual({ k: "2" });
  });

  it("returns isValid=false for garbage", () => {
    const r = parseUrl("not a url");
    expect(r.isValid).toBe(false);
  });

  it("returns isValid=false for empty string", () => {
    expect(parseUrl("").isValid).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const r = parseUrl("  https://a.com/p  ");
    expect(r.isValid).toBe(true);
    expect(r.path).toBe("a.com/p");
  });

  it("drops fragment when no query is present", () => {
    const r = parseUrl("https://a.com/p#frag");
    expect(r.path).toBe("a.com/p");
    expect(r.query).toEqual({});
  });

  it("drops fragment for custom-scheme url", () => {
    const r = parseUrl("xhsdiscover://rn/x#frag");
    expect(r.path).toBe("rn/x");
  });

  it("drops fragment when query is also present", () => {
    const r = parseUrl("https://a.com/p?x=1#frag");
    expect(r.path).toBe("a.com/p");
    expect(r.query).toEqual({ x: "1" });
  });
});
