import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  // iOS applies its own rounded mask, so the logo stays square.
  const src = await logoDataUri();
  return new ImageResponse(<img src={src} width={180} height={180} alt="" />, size);
}
