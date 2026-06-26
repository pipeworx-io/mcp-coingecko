interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * CoinGecko MCP — wraps CoinGecko free API (no auth required)
 *
 * Tools:
 * - get_coin: detailed info for a specific cryptocurrency
 * - search_coins: search cryptocurrencies by name or symbol
 * - get_market_data: top coins by market cap with prices and changes
 * - get_trending: currently trending coins on CoinGecko
 */


const BASE_URL = 'https://api.coingecko.com/api/v3';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_coin',
    description:
      'Get live cryptocurrency data by CoinGecko ID (e.g., \'bitcoin\', \'ethereum\'). Returns USD price, market cap, 24h/7d/30d price changes, ATH, circulating supply, and a short description.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'CoinGecko coin ID (lowercase), e.g. "bitcoin", "ethereum", "solana", "dogecoin"',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_coins',
    description:
      'Search for cryptocurrencies by name or symbol. Returns matching coins with their IDs. Example: search_coins({ query: "bitcoin" })',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — coin name or symbol, e.g. "bitcoin", "ETH", "sol"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_market_data',
    description:
      'Get top cryptocurrencies ranked by market cap with current prices, 24h changes, and volume. Example: get_market_data({ vs_currency: "usd", limit: 10 })',
    inputSchema: {
      type: 'object',
      properties: {
        vs_currency: {
          type: 'string',
          description: 'Currency to show prices in, e.g. "usd", "eur", "btc" (default: "usd")',
        },
        order: {
          type: 'string',
          description: 'Sort order: "market_cap_desc", "volume_desc", "price_desc" (default: "market_cap_desc")',
        },
        limit: {
          type: 'number',
          description: 'Number of coins to return, 1-250 (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_trending',
    description:
      'Get the top trending cryptocurrencies on CoinGecko right now, ranked by 24-hour search activity. Returns coin IDs, names, symbols, market cap ranks, and trend scores. No parameters required.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_coin':
      return getCoin(args.id as string);
    case 'search_coins':
      return searchCoins(args.query as string);
    case 'get_market_data':
      return getMarketData(
        (args.vs_currency as string) ?? 'usd',
        (args.order as string) ?? 'market_cap_desc',
        (args.limit as number) ?? 20,
      );
    case 'get_trending':
      return getTrending();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function getCoin(id: string) {
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    community_data: 'false',
    developer_data: 'false',
  });

  const res = await fetch(`${BASE_URL}/coins/${encodeURIComponent(id)}?${params}`);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const data = (await res.json()) as {
    id: string; symbol: string; name: string;
    description: { en: string };
    market_data: {
      current_price: Record<string, number>;
      market_cap: Record<string, number>;
      total_volume: Record<string, number>;
      price_change_percentage_24h: number;
      price_change_percentage_7d: number;
      price_change_percentage_30d: number;
      ath: Record<string, number>;
      ath_change_percentage: Record<string, number>;
      circulating_supply: number;
      total_supply: number | null;
    };
    market_cap_rank: number;
  };

  const md = data.market_data;
  return {
    id: data.id,
    symbol: data.symbol,
    name: data.name,
    market_cap_rank: data.market_cap_rank,
    description: data.description.en?.slice(0, 500),
    price_usd: md.current_price.usd,
    market_cap_usd: md.market_cap.usd,
    volume_24h_usd: md.total_volume.usd,
    change_24h_pct: md.price_change_percentage_24h,
    change_7d_pct: md.price_change_percentage_7d,
    change_30d_pct: md.price_change_percentage_30d,
    ath_usd: md.ath.usd,
    ath_change_pct: md.ath_change_percentage.usd,
    circulating_supply: md.circulating_supply,
    total_supply: md.total_supply,
  };
}

async function searchCoins(query: string) {
  const params = new URLSearchParams({ query });
  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const data = (await res.json()) as {
    coins: Array<{
      id: string; name: string; api_symbol: string; symbol: string;
      market_cap_rank: number | null; thumb: string;
    }>;
  };

  return {
    count: data.coins.length,
    coins: data.coins.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      market_cap_rank: c.market_cap_rank,
    })),
  };
}

async function getMarketData(vsCurrency: string, order: string, limit: number) {
  const perPage = Math.min(250, Math.max(1, limit));
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order,
    per_page: String(perPage),
    page: '1',
    sparkline: 'false',
  });

  const res = await fetch(`${BASE_URL}/coins/markets?${params}`);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const data = (await res.json()) as Array<{
    id: string; symbol: string; name: string; current_price: number;
    market_cap: number; market_cap_rank: number; total_volume: number;
    price_change_percentage_24h: number; high_24h: number; low_24h: number;
  }>;

  return {
    vs_currency: vsCurrency,
    count: data.length,
    coins: data.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      rank: c.market_cap_rank,
      price: c.current_price,
      market_cap: c.market_cap,
      volume_24h: c.total_volume,
      change_24h_pct: c.price_change_percentage_24h,
      high_24h: c.high_24h,
      low_24h: c.low_24h,
    })),
  };
}

async function getTrending() {
  const res = await fetch(`${BASE_URL}/search/trending`);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const data = (await res.json()) as {
    coins: Array<{
      item: {
        id: string; coin_id: number; name: string; symbol: string;
        market_cap_rank: number; score: number;
      };
    }>;
  };

  return {
    coins: data.coins.map((c) => ({
      id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol,
      market_cap_rank: c.item.market_cap_rank,
      score: c.item.score,
    })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
