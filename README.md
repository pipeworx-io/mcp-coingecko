# mcp-coingecko

CoinGecko MCP — wraps CoinGecko free API (no auth required)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_coin` | Get live cryptocurrency data by CoinGecko ID (e.g., 'bitcoin', 'ethereum'). Returns USD price, market cap, 24h/7d/30d price changes, ATH, circulating supply, and a short description. |
| `search_coins` | Search for cryptocurrencies by name or symbol. Returns matching coins with their IDs. Example: search_coins({ query: "bitcoin" }) |
| `get_market_data` | Get top cryptocurrencies ranked by market cap with current prices, 24h changes, and volume. Example: get_market_data({ vs_currency: "usd", limit: 10 }) |
| `get_trending` | Get the top trending cryptocurrencies on CoinGecko right now, ranked by 24-hour search activity. Returns coin IDs, names, symbols, market cap ranks, and trend scores. No parameters required. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "coingecko": {
      "url": "https://gateway.pipeworx.io/coingecko/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Coingecko data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
