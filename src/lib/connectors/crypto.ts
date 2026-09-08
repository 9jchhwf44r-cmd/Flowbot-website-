import { ConnectorInfo } from "./types";

// Publieke CoinGecko-API — geen API-key of account nodig, altijd "live".
const API_BASE = "https://api.coingecko.com/api/v3";

export interface CryptoSnapshot {
  priceEur: number;
  changePct24h: number;
  sparkline: number[];
}

export function describeCrypto(): ConnectorInfo {
  return {
    id: "crypto",
    label: "Markt",
    status: "connected",
    detail: "Actief — live Bitcoin-koers via CoinGecko, geen API-key nodig.",
  };
}

export async function getBitcoinSnapshot(): Promise<CryptoSnapshot> {
  const [priceRes, chartRes] = await Promise.all([
    fetch(`${API_BASE}/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true`),
    fetch(`${API_BASE}/coins/bitcoin/market_chart?vs_currency=eur&days=1`),
  ]);

  if (!priceRes.ok || !chartRes.ok) {
    throw new Error("CoinGecko gaf een foutstatus terug");
  }

  const priceData = (await priceRes.json()) as {
    bitcoin?: { eur?: number; eur_24h_change?: number };
  };
  const chartData = (await chartRes.json()) as { prices?: Array<[number, number]> };

  const prices = chartData.prices || [];
  const sparkline = prices.filter((_, i) => i % 4 === 0).map(([, p]) => p);

  return {
    priceEur: priceData.bitcoin?.eur ?? 0,
    changePct24h: priceData.bitcoin?.eur_24h_change ?? 0,
    sparkline,
  };
}
