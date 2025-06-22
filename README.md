# Google Ads MCP Server for TypingMind

A Model Context Protocol (MCP) server that provides Google Ads integration for TypingMind, allowing you to analyze advertising data through natural language conversations.

## Features

- **Account Management**: List all accessible Google Ads accounts (MCC and client accounts)
- **Account Information**: Get detailed account information including currency, timezone, and status
- **Ad Spend Analytics**: Retrieve ad spend data for specific time periods
- **Keyword Performance**: Analyze keyword performance metrics and quality scores

## Available Tools

1. **`list_google_ads_accounts`** - List all accessible Google Ads accounts
2. **`get_account_info`** - Get detailed information about a specific account
3. **`get_ad_spend`** - Get ad spend data for a specific account over a time period
4. **`get_keyword_performance`** - Get keyword performance data for a specific account

## Setup

### Prerequisites

- Node.js 18+ 
- Google Ads API credentials
- TypingMind account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `test.env`:
   ```
   GOOGLE_ADS_CLIENT_ID=your_client_id
   GOOGLE_ADS_CLIENT_SECRET=your_client_secret
   GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
   GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
   GOOGLE_ADS_LOGIN_CUSTOMER_ID=your_mcc_customer_id
   ```

### Running Locally

```bash
npm start
```

## Deployment

### Render Deployment

This project is configured for deployment on Render:

1. Connect your GitHub repository to Render
2. Set the following environment variables in Render:
   - `GOOGLE_ADS_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET`
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_ADS_REFRESH_TOKEN`
   - `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
3. Set the build command: `npm install`
4. Set the start command: `npm start`

## TypingMind Integration

1. In TypingMind, go to **Settings → Advanced Settings → Model Context Protocol**
2. Set the Connector URL to your deployed server URL
3. Add the Google Ads MCP server configuration:
   ```json
   {
     "mcpServers": {
       "googleAds": {
         "command": "node",
         "args": ["./typingmind-mcp-server.js"],
         "env": {"NODE_ENV": "production"}
       }
     }
   }
   ```

## Project Structure

```
├── lib/
│   ├── googleAds.js          # Google Ads API integration
│   ├── clickUp.js            # ClickUp integration
│   └── server.js             # Server utilities
├── typingmind-mcp-server.js  # Main MCP server
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## License

MIT
