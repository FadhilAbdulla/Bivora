import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { logoDataUri } from "@/lib/logo-image";

export const alt = "Bivora — trade stocks, indices, commodities and metals from one account";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fixed, rising candle series for the decorative chart: [open, close, high, low] in chart units.
const CANDLES: [number, number, number, number][] = [
  [40, 52, 56, 36], [52, 47, 55, 43], [47, 60, 64, 45], [60, 56, 63, 52], [56, 70, 74, 54],
  [70, 66, 73, 62], [66, 80, 84, 64], [80, 76, 83, 72], [76, 92, 96, 74], [92, 88, 95, 84],
  [88, 104, 108, 86], [104, 100, 107, 96], [100, 118, 122, 98], [118, 130, 136, 115],
];
const UP = "#16c784";
const DOWN = "#f6465d";
const MARKETS = ["Stocks", "Indices", "Commodities", "Metals"];

const fontDir = join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");

export default async function OpengraphImage() {
  const [regular, semiBold] = await Promise.all([
    readFile(join(fontDir, "Geist-Regular.ttf")),
    readFile(join(fontDir, "Geist-SemiBold.ttf")),
  ]);
  const mark = await logoDataUri();
  const chartHeight = 300;
  // Map the candle range (30–140) onto the chart height.
  const scale = (v: number) => chartHeight - ((v - 30) / 110) * chartHeight;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND.background,
          backgroundImage:
            "radial-gradient(ellipse 60% 70% at 15% 0%, rgba(58,123,253,0.35), transparent 70%), radial-gradient(ellipse 50% 60% at 100% 100%, rgba(22,199,132,0.22), transparent 70%)",
          color: "#e8edf6",
          fontFamily: "Geist",
          padding: "64px 72px",
          position: "relative",
        }}
      >
        {/* Left: brand + copy */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <img src={mark} width={84} height={84} alt="" style={{ borderRadius: 18 }} />
            <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -1.5 }}>{BRAND.name}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 66, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2.5, display: "flex", flexDirection: "column" }}>
              <span>Trade global markets</span>
              <span style={{ color: "#5fa8ff" }}>with precision.</span>
            </div>
            <div style={{ fontSize: 26, color: "#8591a8", lineHeight: 1.4 }}>
              Fund, track and withdraw from one secure dashboard.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {MARKETS.map((m) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  fontSize: 22,
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "1px solid #1b2335",
                  background: "rgba(17,23,38,0.85)",
                  color: "#c7d0e0",
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Right: decorative candlestick chart */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: "auto",
            width: 400,
            alignSelf: "center",
            borderRadius: 24,
            border: "1px solid #1b2335",
            background: "rgba(10,14,23,0.9)",
            padding: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 20, color: "#8591a8" }}>
            <span style={{ color: "#e8edf6", fontWeight: 600 }}>XAU/USD</span>
            <span>Gold · 1D</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: chartHeight, marginTop: 20, position: "relative" }}>
            {CANDLES.map(([o, c, h, l], i) => {
              const up = c >= o;
              const top = scale(Math.max(o, c));
              const bodyH = Math.max((Math.abs(c - o) / 110) * chartHeight, 4);
              return (
                <div key={i} style={{ display: "flex", position: "relative", width: 18, height: chartHeight }}>
                  <div style={{ position: "absolute", left: 8, top: scale(h), width: 2, height: scale(l) - scale(h), background: up ? UP : DOWN }} />
                  <div style={{ position: "absolute", left: 0, top, width: 18, height: bodyH, borderRadius: 3, background: up ? UP : DOWN }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semiBold, weight: 600, style: "normal" },
      ],
    },
  );
}
