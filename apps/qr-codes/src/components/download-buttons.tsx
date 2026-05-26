import { Button } from "@/components/ui/button";

export function DownloadButtons({ id, title }: { id: string; title: string }) {
  const safe =
    title
      .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || id;
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <a
          href={`/api/qr/${id}?format=png&filename=${encodeURIComponent(safe + ".png")}`}
          download={`${safe}.png`}
        >
          Download PNG
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={`/api/qr/${id}?format=svg&filename=${encodeURIComponent(safe + ".svg")}`}
          download={`${safe}.svg`}
        >
          Download SVG
        </a>
      </Button>
    </div>
  );
}
