import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

const LABELS: Record<number, string> = {
  20: "20×20 – iPad Notifications (1x)",
  29: "29×29 – Settings (1x)",
  40: "40×40 – Spotlight (2x of 20)",
  58: "58×58 – Settings (2x of 29)",
  60: "60×60 – Notifications (3x of 20)",
  76: "76×76 – iPad App (1x)",
  80: "80×80 – Spotlight (2x of 40)",
  87: "87×87 – Settings (3x of 29)",
  120: "120×120 – iPhone App (2x of 60)",
  152: "152×152 – iPad App (2x of 76)",
  167: "167×167 – iPad Pro App",
  180: "180×180 – iPhone App (3x of 60)",
  1024: "1024×1024 – App Store",
};

export default function GenerateIcons() {
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      SIZES.forEach((size) => {
        const canvas = canvasRefs.current.get(size);
        if (!canvas) return;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      });
    };
    img.src = "/icon-512.svg";
  }, []);

  const download = useCallback((size: number) => {
    const canvas = canvasRefs.current.get(size);
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `icon-${size}x${size}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }, []);

  const downloadAll = useCallback(() => {
    SIZES.forEach((size, i) => setTimeout(() => download(size), i * 150));
  }, [download]);

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">iOS App Icon Generator</h1>
      <p className="text-muted-foreground mb-6">
        All icons rendered from your SVG. Download individually or all at once.
      </p>

      <Button onClick={downloadAll} className="mb-8">
        <Download className="w-4 h-4 mr-2" /> Download All ({SIZES.length} icons)
      </Button>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(size, el);
              }}
              className="border border-border rounded bg-muted"
              style={{ width: Math.min(size, 120), height: Math.min(size, 120) }}
            />
            <span className="text-xs text-muted-foreground text-center">
              {LABELS[size]}
            </span>
            <Button variant="outline" size="sm" onClick={() => download(size)}>
              <Download className="w-3 h-3 mr-1" /> {size}px
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
