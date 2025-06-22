require('dotenv').config({ path: './test.env' });
const { 
  listAccessibleAccounts, 
  getAccountInfo, 
  getAdSpend, 
  getKeywordPerformance 
} = require('./lib/googleAds.js');

// MCP Server implementation for TypingMind
class TypingMindMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'list_google_ads_accounts',
        description: 'List all accessible Google Ads accounts (MCC and client accounts)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_account_info',
        description: 'Get detailed information about a specific Google Ads account',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Google Ads customer ID (without dashes)'
            }
          },
          required: ['customerId']
        }
      },
      {
        name: 'get_ad_spend',
        description: 'Get ad spend data for a specific account over a time period',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Google Ads customer ID (without dashes)'
            },
            days: {
              type: 'number',
              description: 'Number of days to look back (default: 7)',
              default: 7
            }
          },
          required: ['customerId']
        }
      },
      {
        name: 'get_keyword_performance',
        description: 'Get keyword performance data for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Google Ads customer ID (without dashes)'
            },
            days: {
              type: 'number',
              description: 'Number of days to look back (default: 7)',
              default: 7
            }
          },
          required: ['customerId']
        }
      }
    ];
  }

  async handleToolCall(toolName, args) {
    console.log(`MCP Tool Call: ${toolName}`, args);
    
    try {
      switch (toolName) {
        case 'list_google_ads_accounts':
          const accounts = await listAccessibleAccounts();
          return {
            success: true,
            data: accounts,
            message: `Found ${accounts.length} accessible accounts`
          };
          
        case 'get_account_info':
          const { customerId } = args;
          if (!customerId) {
            throw new Error('customerId is required');
          }
          const accountInfo = await getAccountInfo(customerId);
          return {
            success: true,
            data: accountInfo,
            message: `Account info retrieved for ${customerId}`
          };
          
        case 'get_ad_spend':
          const { customerId: spendCustomerId, days = 7 } = args;
          if (!spendCustomerId) {
            throw new Error('customerId is required');
          }
          const spendData = await getAdSpend(spendCustomerId, days);
          return {
            success: true,
            data: spendData,
            message: `Ad spend data retrieved for ${spendCustomerId} (${days} days)`
          };
          
        case 'get_keyword_performance':
          const { customerId: keywordCustomerId, days: keywordDays = 7 } = args;
          if (!keywordCustomerId) {
            throw new Error('customerId is required');
          }
          const keywordData = await getKeywordPerformance(keywordCustomerId, keywordDays);
          return {
            success: true,
            data: keywordData,
            message: `Keyword performance data retrieved for ${keywordCustomerId} (${keywordDays} days)`
          };
          
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error('MCP Tool Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getTools() {
    return this.tools;
  }
}

// Export for use with TypingMind MCP Connector
module.exports = TypingMindMCPServer;

// If run directly, start the server
if (require.main === module) {
  const server = new TypingMindMCPServer();
  console.log('🚀 Google Ads MCP Server initialized');
  console.log('📋 Available tools:');
  server.getTools().forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
  console.log('\\n✅ Ready for TypingMind MCP Connector');
} 