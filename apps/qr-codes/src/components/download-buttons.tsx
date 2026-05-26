import { Button } from "@/components/ui/button";

export function DownloadButtons({ id, title }: { id: string; title: string }) {
  const safe = title.replace(/[^a-z0-9\-_]+/gi, "-").toLowerCase() || id;
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/api/qr/${id}?format=png&filename=${safe}.png`} download={`${safe}.png`}>
          Download PNG
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/qr/${id}?format=svg&filename=${safe}.svg`} download={`${safe}.svg`}>
          Download SVG
        </a>
      </Button>
    </div>
  );
}
