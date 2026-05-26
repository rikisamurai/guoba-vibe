import QRCode from "qrcode";

export type QrOptions = {
  width?: number;
  margin?: number;
};

const DEFAULTS: Required<QrOptions> = { width: 512, margin: 2 };

export async function renderSvg(data: string, opts: QrOptions = {}): Promise<string> {
  if (!data) throw new Error("renderSvg: data is required");
  const { width, margin } = { ...DEFAULTS, ...opts };
  const svg = await QRCode.toString(data, {
    type: "svg",
    width,
    margin,
    errorCorrectionLevel: "M",
  });
  return svg.startsWith("<?xml") ? svg : `<?xml version="1.0" encoding="UTF-8"?>${svg}`;
}

export async function renderPng(data: string, opts: QrOptions = {}): Promise<Buffer> {
  if (!data) throw new Error("renderPng: data is required");
  const { width, margin } = { ...DEFAULTS, ...opts };
  return QRCode.toBuffer(data, {
    type: "png",
    width,
    margin,
    errorCorrectionLevel: "M",
  });
}
