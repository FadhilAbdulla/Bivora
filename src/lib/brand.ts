// Brand constants. The logo artwork is public/brand/bivora-logo.svg (square, transparent background).

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://www.bivoramarkets.com" : "http://localhost:3000");

export const BRAND = {
  name: "Bivora",
  tagline: "Trade global markets with precision.",
  description:
    "Bivora is a multi-asset trading platform for stocks, indices, commodities and metals. Fund your account, follow live prices and manage deposits and withdrawals from one secure dashboard.",
  logoPath: "/brand/bivora-logo.svg",
  background: "#070908",
};
