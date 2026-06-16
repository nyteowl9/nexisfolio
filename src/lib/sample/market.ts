/**
 * Demo watchlist + news data, ported from the prototype. These are static
 * sample sets (a default market list + curated stories); a real per-user
 * watchlist and a live news feed are later enhancements.
 */
import type { AssetClass } from "@/lib/engine";

export interface WatchRow {
  cls: AssetClass;
  sym: string;
  name: string;
  price: number;
  prev: number;
  chg: number;
}

const rawWatch: Array<[AssetClass, string, string, number, number]> = [
  ["crypto", "BTC", "Bitcoin", 68420, 67980], ["crypto", "ETH", "Ethereum", 3512, 3488], ["crypto", "BNB", "BNB", 604, 612],
  ["crypto", "SOL", "Solana", 154.8, 159.2], ["crypto", "XRP", "XRP", 0.62, 0.605], ["crypto", "DOGE", "Dogecoin", 0.158, 0.149],
  ["crypto", "ADA", "Cardano", 0.46, 0.468], ["crypto", "AVAX", "Avalanche", 36.2, 35.1], ["crypto", "TRX", "TRON", 0.123, 0.121],
  ["crypto", "LINK", "Chainlink", 17.4, 16.9], ["crypto", "DOT", "Polkadot", 7.15, 7.32], ["crypto", "POL", "Polygon", 0.71, 0.69],
  ["crypto", "LTC", "Litecoin", 84.6, 83.1], ["crypto", "BCH", "Bitcoin Cash", 482, 475], ["crypto", "NEAR", "NEAR Protocol", 6.84, 7.02],
  ["crypto", "UNI", "Uniswap", 11.2, 10.7], ["crypto", "ICP", "Internet Computer", 12.9, 13.2], ["crypto", "APT", "Aptos", 9.34, 9.05],
  ["crypto", "ATOM", "Cosmos", 8.42, 8.61],
  ["stocks", "AAPL", "Apple", 212.4, 210.9], ["stocks", "MSFT", "Microsoft", 445.2, 447.1], ["stocks", "NVDA", "NVIDIA", 125.1, 122.4],
  ["stocks", "GOOGL", "Alphabet", 178.3, 176.8], ["stocks", "AMZN", "Amazon", 186.5, 184.2], ["stocks", "META", "Meta Platforms", 498.1, 503.4],
  ["stocks", "TSLA", "Tesla", 182.1, 188.9],
];

export const WATCHLIST: WatchRow[] = rawWatch.map(([cls, sym, name, price, prev]) => ({
  cls,
  sym,
  name,
  price,
  prev,
  chg: ((price - prev) / prev) * 100,
}));

export interface NewsItem {
  id: string;
  cls: AssetClass;
  tickers: string[];
  sentiment: "pos" | "neg" | "neutral";
  source: string;
  time: string;
  top?: boolean;
  title: string;
  summary: string;
}

export const NEWS: NewsItem[] = [
  { id: "n1", cls: "crypto", tickers: ["BTC"], sentiment: "pos", source: "CoinDesk", time: "2h ago", top: true, title: "Bitcoin reclaims $68K as spot ETF inflows hit a 6-week high", summary: "Institutional desks added to positions through the morning session, with the largest US spot vehicles logging net creations for a fifth straight day." },
  { id: "n2", cls: "stocks", tickers: ["NVDA", "MSFT"], sentiment: "pos", source: "Bloomberg", time: "4h ago", top: true, title: "AI capex guidance lifts NVIDIA and Microsoft into the green", summary: "Updated datacenter spending commitments from two hyperscalers reinforced demand expectations for accelerator silicon heading into the back half of the year." },
  { id: "n3", cls: "metals", tickers: ["XAU"], sentiment: "pos", source: "Reuters", time: "5h ago", top: true, title: "Gold steadies near record as real yields drift lower", summary: "Bullion held above $2,350/oz with traders positioning ahead of next week’s inflation print; silver tracked higher on industrial demand." },
  { id: "n4", cls: "stocks", tickers: ["TSLA"], sentiment: "neg", source: "CNBC", time: "7h ago", title: "Tesla slips on softer delivery commentary from suppliers", summary: "Component makers trimmed near-term shipment outlooks, pressuring the stock despite an unchanged full-year production target." },
  { id: "n5", cls: "crypto", tickers: ["ETH", "SOL"], sentiment: "neutral", source: "The Block", time: "9h ago", title: "Ethereum and Solana fees diverge as L2 activity migrates", summary: "On-chain data showed rollup settlement steady on Ethereum while Solana priority fees cooled from last month’s highs." },
  { id: "n6", cls: "realest", tickers: [], sentiment: "neg", source: "WSJ", time: "11h ago", title: "Sun Belt rents flatten as new supply comes online in Austin", summary: "A wave of multifamily completions is tempering rent growth across Texas metros, with concessions reappearing in several submarkets." },
  { id: "n7", cls: "stocks", tickers: ["AAPL"], sentiment: "pos", source: "Reuters", time: "13h ago", title: "Apple services revenue estimates nudged higher into print", summary: "Several analysts raised services forecasts citing App Store and advertising momentum, offsetting muted hardware expectations." },
  { id: "n8", cls: "crypto", tickers: ["LINK"], sentiment: "pos", source: "CoinDesk", time: "15h ago", title: "Chainlink expands cross-chain settlement pilot with two banks", summary: "A new tokenized-asset pilot extends the interoperability protocol’s reach into regulated settlement workflows." },
  { id: "n9", cls: "metals", tickers: ["XAG"], sentiment: "neutral", source: "Kitco", time: "18h ago", title: "Silver’s gold ratio narrows as solar demand forecasts firm", summary: "Analysts flagged tightening above-ground inventories against resilient photovoltaic consumption into 2027." },
];
