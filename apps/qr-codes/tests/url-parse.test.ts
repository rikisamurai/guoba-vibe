import { describe, it, expect } from "vitest";
import { parseUrl, buildUrl } from "@/lib/url-parse";

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

describe("buildUrl", () => {
  it("builds https url with no query", () => {
    expect(buildUrl({ scheme: "https", path: "a.com/p", query: [] })).toBe(
      "https://a.com/p",
    );
  });

  it("builds custom-scheme deep link", () => {
    expect(buildUrl({ scheme: "xhsdiscover", path: "rn/x", query: [] })).toBe(
      "xhsdiscover://rn/x",
    );
  });

  it("appends single query param", () => {
    expect(
      buildUrl({
        scheme: "https",
        path: "a.com",
        query: [{ key: "k", value: "v" }],
      }),
    ).toBe("https://a.com?k=v");
  });

  it("preserves query order across multiple params", () => {
    expect(
      buildUrl({
        scheme: "https",
        path: "a.com",
        query: [
          { key: "a", value: "1" },
          { key: "b", value: "2" },
        ],
      }),
    ).toBe("https://a.com?a=1&b=2");
  });

  it("retains key with empty value", () => {
    expect(
      buildUrl({
        scheme: "https",
        path: "a.com",
        query: [{ key: "k", value: "" }],
      }),
    ).toBe("https://a.com?k=");
  });

  it("skips rows whose key is empty", () => {
    expect(
      buildUrl({
        scheme: "https",
        path: "a.com",
        query: [
          { key: "", value: "x" },
          { key: "k", value: "v" },
        ],
      }),
    ).toBe("https://a.com?k=v");
  });

  it("URI-encodes special characters in keys and values", () => {
    expect(
      buildUrl({
        scheme: "https",
        path: "a.com",
        query: [{ key: "q", value: "a b&c" }],
      }),
    ).toBe("https://a.com?q=a%20b%26c");
    expect(
      buildUrl({
        scheme: "https",
        path: "a.com",
        query: [{ key: "中文", value: "测试" }],
      }),
    ).toBe(
      "https://a.com?%E4%B8%AD%E6%96%87=%E6%B5%8B%E8%AF%95",
    );
  });

  it("returns empty string when scheme is empty", () => {
    expect(buildUrl({ scheme: "", path: "a", query: [] })).toBe("");
  });

  it("does not normalize or alter the path", () => {
    expect(
      buildUrl({
        scheme: "xhsdiscover",
        path: "rn/wakanda/buyer-conversion",
        query: [],
      }),
    ).toBe("xhsdiscover://rn/wakanda/buyer-conversion");
  });

  it("round-trips parseUrl → buildUrl → parseUrl preserving fields", () => {
    const original = "xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2";
    const parsed = parseUrl(original);
    const rebuilt = buildUrl({
      scheme: parsed.scheme,
      path: parsed.path,
      query: Object.entries(parsed.query).map(([key, value]) => ({ key, value })),
    });
    const reparsed = parseUrl(rebuilt);
    expect(reparsed.isValid).toBe(true);
    expect(reparsed.scheme).toBe(parsed.scheme);
    expect(reparsed.path).toBe(parsed.path);
    expect(reparsed.query).toEqual(parsed.query);
  });
});
