// Bivora mark: a "B" whose stem is a candlestick (body + wicks) on the brand gradient tile.
// Shared by the in-app logo, the favicon/app icons and the social share image.

export const BRAND = {
  name: "Bivora",
  tagline: "Trade global markets with precision.",
  description:
    "Bivora is a multi-asset trading platform for stocks, indices, commodities and metals. Fund your account, follow live prices and manage deposits and withdrawals from one secure dashboard.",
  gradientFrom: "#3a7bfd",
  gradientTo: "#16c784",
  background: "#05070c",
};

/** Paths in a 64×64 viewBox. */
export const MARK = {
  wick: { x1: 21, y1: 9, x2: 21, y2: 55 },
  body: { x: 16, y: 16, width: 10, height: 32, rx: 2 },
  bowls: "M26 18.5h8.5a6.75 6.75 0 0 1 0 13.5H26M26 32h10a8 8 0 0 1 0 16H26",
};

/** Standalone SVG markup of the mark (for data URIs and static files). */
export function markSvg({ size = 64, rounded = true }: { size?: number; rounded?: boolean } = {}) {
  const { wick, body, bowls } = MARK;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BRAND.gradientFrom}"/><stop offset="1" stop-color="${BRAND.gradientTo}"/></linearGradient></defs><rect width="64" height="64" rx="${rounded ? 15 : 0}" fill="url(#g)"/><line x1="${wick.x1}" y1="${wick.y1}" x2="${wick.x2}" y2="${wick.y2}" stroke="#fff" stroke-width="3" stroke-linecap="round"/><rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" rx="${body.rx}" fill="#fff"/><path d="${bowls}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`;
}
