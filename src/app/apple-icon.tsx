import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { logoDataUri } from "@/lib/logo-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  // iOS needs an opaque icon and applies its own rounded mask.
  const src = await logoDataUri();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.background }}>
        <img src={src} width={144} height={144} alt="" />
      </div>
    ),
    size,
  );
}
