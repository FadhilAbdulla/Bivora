// Instrument catalogue for the marketing site and dashboard. Bivora offers four
// markets; live quotes and charts come from TradingView widgets using these symbols.

export type AssetClass = "stocks" | "indices" | "commodities" | "metals";

export type Instrument = { tv: string; name: string; label: string };

export const ASSET_CLASSES: {
  id: AssetClass;
  title: string;
  blurb: string;
  description: string;
  highlights: string[];
  icon: string;
  instruments: Instrument[];
}[] = [
  {
    id: "stocks",
    title: "Stocks",
    blurb: "Trade the world's biggest companies, from US tech leaders to global blue chips.",
    description:
      "Go long or short on the shares of the companies shaping the global economy. React to earnings, product launches and market news without owning the underlying shares.",
    highlights: ["US tech and blue-chip shares", "Go long or short", "Trade earnings season moves"],
    icon: "M3 3v18h18M7 15l4-4 3 3 6-6",
    instruments: [
      { tv: "NASDAQ:AAPL", name: "Apple", label: "AAPL" },
      { tv: "NASDAQ:NVDA", name: "NVIDIA", label: "NVDA" },
      { tv: "NASDAQ:MSFT", name: "Microsoft", label: "MSFT" },
      { tv: "NASDAQ:TSLA", name: "Tesla", label: "TSLA" },
      { tv: "NASDAQ:AMZN", name: "Amazon", label: "AMZN" },
      { tv: "NASDAQ:META", name: "Meta Platforms", label: "META" },
      { tv: "NASDAQ:GOOGL", name: "Alphabet", label: "GOOGL" },
      { tv: "NYSE:JPM", name: "JPMorgan Chase", label: "JPM" },
    ],
  },
  {
    id: "indices",
    title: "Indices",
    blurb: "Take a view on entire economies with the world's leading stock indices.",
    description:
      "Trade the performance of a whole market in a single position. Indices let you act on broad economic trends in the US, Europe and Asia instead of picking individual companies.",
    highlights: ["US, European and Asian benchmarks", "Broad market exposure in one trade", "Popular for trend and news trading"],
    icon: "M4 19V9M10 19V5M16 19v-7M22 19H2",
    instruments: [
      { tv: "FOREXCOM:SPXUSD", name: "S&P 500", label: "US500" },
      { tv: "FOREXCOM:NSXUSD", name: "Nasdaq 100", label: "US100" },
      { tv: "FOREXCOM:DJI", name: "Dow Jones 30", label: "US30" },
      { tv: "INDEX:DEU40", name: "DAX 40", label: "GER40" },
      { tv: "FOREXCOM:UKXGBP", name: "FTSE 100", label: "UK100" },
      { tv: "INDEX:NKY", name: "Nikkei 225", label: "JPN225" },
    ],
  },
  {
    id: "commodities",
    title: "Commodities",
    blurb: "Energy and agricultural markets, from crude oil and natural gas to grains.",
    description:
      "Trade the raw materials that power the world economy. Energy and agricultural prices move on supply, weather and geopolitics, creating opportunities in both directions.",
    highlights: ["Crude oil and natural gas", "Grains and soft commodities", "Driven by supply and global events"],
    icon: "M12 2c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z",
    instruments: [
      { tv: "TVC:USOIL", name: "WTI Crude Oil", label: "USOIL" },
      { tv: "TVC:UKOIL", name: "Brent Crude Oil", label: "UKOIL" },
      { tv: "OANDA:NATGASUSD", name: "Natural Gas", label: "NGAS" },
      { tv: "OANDA:CORNUSD", name: "Corn", label: "CORN" },
      { tv: "OANDA:WHEATUSD", name: "Wheat", label: "WHEAT" },
      { tv: "OANDA:SOYBNUSD", name: "Soybeans", label: "SOYBEAN" },
    ],
  },
  {
    id: "metals",
    title: "Metals",
    blurb: "Gold, silver and industrial metals — classic safe havens and inflation hedges.",
    description:
      "Precious metals have been a store of value for centuries, and industrial metals track global growth. Trade gold, silver and more against the US dollar.",
    highlights: ["Gold and silver against USD", "Platinum, palladium and copper", "Classic safe-haven assets"],
    icon: "M6 3h12l4 6-10 12L2 9zM2 9h20M12 21L8 9l4-6 4 6z",
    instruments: [
      { tv: "OANDA:XAUUSD", name: "Gold", label: "XAU/USD" },
      { tv: "OANDA:XAGUSD", name: "Silver", label: "XAG/USD" },
      { tv: "OANDA:XPTUSD", name: "Platinum", label: "XPT/USD" },
      { tv: "OANDA:XPDUSD", name: "Palladium", label: "XPD/USD" },
      { tv: "OANDA:XCUUSD", name: "Copper", label: "COPPER" },
    ],
  },
];

// Instruments shown in the hero terminal.
export const HERO_INSTRUMENTS = [
  { tv: "OANDA:XAUUSD", label: "XAU/USD", name: "Gold" },
  { tv: "FOREXCOM:SPXUSD", label: "US500", name: "S&P 500" },
  { tv: "FOREXCOM:NSXUSD", label: "US100", name: "Nasdaq 100" },
  { tv: "TVC:UKOIL", label: "UKOIL", name: "Brent Crude" },
];

export const TICKER_TAPE = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
  { proName: "FOREXCOM:DJI", title: "Dow 30" },
  { proName: "INDEX:DEU40", title: "DAX 40" },
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "OANDA:XAGUSD", title: "Silver" },
  { proName: "TVC:UKOIL", title: "Brent" },
  { proName: "TVC:USOIL", title: "WTI" },
  { proName: "OANDA:NATGASUSD", title: "Natural Gas" },
  { proName: "NASDAQ:NVDA", title: "NVIDIA" },
  { proName: "NASDAQ:AAPL", title: "Apple" },
  { proName: "NASDAQ:TSLA", title: "Tesla" },
  { proName: "NASDAQ:MSFT", title: "Microsoft" },
];
