import { ImageResponse } from "next/og";
import { markSvg } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS applies its own rounded mask, so the tile is drawn square.
  const src = `data:image/svg+xml;base64,${Buffer.from(markSvg({ size: 180, rounded: false })).toString("base64")}`;
  return new ImageResponse(<img src={src} width={180} height={180} alt="" />, size);
}
