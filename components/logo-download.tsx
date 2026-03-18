"use client";

import { Download, Archive } from "lucide-react";

type LogoVariant = "dark" | "light" | "icon-dark" | "icon-light" | "icon-accent" | "icon-muted";
type FileFormat = "svg" | "png" | "jpg";

const ALL_VARIANTS: LogoVariant[] = ["dark", "light", "icon-dark", "icon-light", "icon-accent", "icon-muted"];
const ALL_FORMATS: FileFormat[] = ["svg", "png", "jpg"];

const RASTER_SCALE = 4; // 4x for crisp exports

function makeSvg(variant: LogoVariant): string {
  const packagePath = `<path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" />`;

  const iconSvg = (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${packagePath}</svg>`;

  const lockupSvg = (bg: string, fg: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="80" viewBox="0 0 280 80">
      <rect width="280" height="80" rx="8" fill="${bg}" />
      <g transform="translate(24, 28)" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        ${packagePath}
      </g>
      <text x="58" y="47" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="${fg}" letter-spacing="-0.02em">intertool</text>
    </svg>`;

  switch (variant) {
    case "dark":
      return lockupSvg("#0a0a0b", "#fafafa");
    case "light":
      return lockupSvg("#fafafa", "#0a0a0b");
    case "icon-dark":
      return iconSvg("#fafafa");
    case "icon-light":
      return iconSvg("#0a0a0b");
    case "icon-accent":
      return iconSvg("#6366f1");
    case "icon-muted":
      return iconSvg("#71717a");
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function svgToRaster(
  svgString: string,
  format: "png" | "jpg",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * RASTER_SCALE;
      canvas.height = img.height * RASTER_SCALE;
      const ctx = canvas.getContext("2d")!;

      if (format === "jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        format === "png" ? "image/png" : "image/jpeg",
        0.95,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG"));
    };
    img.src = url;
  });
}

async function downloadAs(variant: LogoVariant, format: FileFormat) {
  const svg = makeSvg(variant);

  if (format === "svg") {
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `intertool-${variant}.svg`);
    return;
  }

  const blob = await svgToRaster(svg, format);
  const ext = format === "jpg" ? "jpg" : "png";
  downloadBlob(blob, `intertool-${variant}.${ext}`);
}

export function LogoDownload({ variant }: { variant: LogoVariant }) {
  return (
    <div className="flex items-center gap-1">
      {ALL_FORMATS.map((fmt) => (
        <button
          key={fmt}
          onClick={() => downloadAs(variant, fmt)}
          className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          <Download className="h-2.5 w-2.5" />
          {fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function DownloadAllLogos() {
  async function handleDownloadAll() {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    for (const variant of ALL_VARIANTS) {
      const svg = makeSvg(variant);
      zip.file(`svg/intertool-${variant}.svg`, svg);

      const pngBlob = await svgToRaster(svg, "png");
      zip.file(`png/intertool-${variant}.png`, pngBlob);

      const jpgBlob = await svgToRaster(svg, "jpg");
      zip.file(`jpg/intertool-${variant}.jpg`, jpgBlob);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "intertool-brand-assets.zip");
  }

  return (
    <button
      onClick={handleDownloadAll}
      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
    >
      <Archive className="h-3.5 w-3.5" />
      Download all assets (.zip)
    </button>
  );
}
