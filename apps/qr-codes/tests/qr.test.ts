import { describe, it, expect } from "vitest";
import { renderSvg, renderPng } from "@/lib/qr";

describe("renderSvg", () => {
  it("returns an SVG string for a custom-scheme URL", async () => {
    const svg = await renderSvg("xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1");
    expect(svg.startsWith("<?xml")).toBe(true);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("respects margin and width options", async () => {
    const small = await renderSvg("https://a.com", { width: 128 });
    const large = await renderSvg("https://a.com", { width: 512 });
    expect(small).toContain('width="128"');
    expect(large).toContain('width="512"');
  });

  it("throws for empty input", async () => {
    await expect(renderSvg("")).rejects.toThrow();
  });
});

describe("renderPng", () => {
  it("returns a PNG buffer with correct magic bytes", async () => {
    const buf = await renderPng("https://a.com", { width: 256 });
    expect(buf.length).toBeGreaterThan(100);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });
});
