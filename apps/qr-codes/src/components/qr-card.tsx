import { renderSvg } from "@/lib/qr";
import { QrCardLink } from "@/components/qr-card-link";

export async function QrCard({
  id,
  title,
  url,
  returnHref,
}: {
  id: string;
  title: string;
  url: string;
  returnHref?: string;
}) {
  const svg = await renderSvg(url, { width: 256, margin: 1 });
  return (
    <QrCardLink
      id={id}
      href={`/q/${id}`}
      returnHref={returnHref}
      className="block rounded-lg border p-4 hover:shadow-md transition"
    >
      <div
        className="aspect-square w-full max-w-[180px] mx-auto [&_svg]:w-full [&_svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <h3 className="mt-3 font-medium truncate">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground font-mono truncate">{url}</p>
    </QrCardLink>
  );
}
