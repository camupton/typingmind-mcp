const https = require('https');

// MCP Server URLs to analyze
const mcpServers = [
  {
    name: 'Google Search Console',
    url: 'https://github.com/ahonn/mcp-server-gsc',
    rawBase: 'https://raw.githubusercontent.com/ahonn/mcp-server-gsc/main'
  },
  {
    name: 'Airtable',
    url: 'https://github.com/rashidazarang/airtable-mcp',
    rawBase: 'https://raw.githubusercontent.com/rashidazarang/airtable-mcp/main'
  },
  {
    name: 'Supabase',
    url: 'https://github.com/supabase-community/supabase-mcp',
    rawBase: 'https://raw.githubusercontent.com/supabase-community/supabase-mcp/main'
  },
  {
    name: 'ClickUp',
    url: 'https://github.com/taazkareem/clickup-mcp-server',
    rawBase: 'https://raw.githubusercontent.com/taazkareem/clickup-mcp-server/main'
  },
  {
    name: 'Mem0',
    url: 'https://mem0.ai/openmemory-mcp',
    rawBase: null // Different format
  }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function analyzeMCPServer(server) {
  console.log(`\n🔍 Analyzing ${server.name} MCP Server`);
  console.log(`   Repository: ${server.url}`);
  
  try {
    if (server.rawBase) {
      // Fetch package.json
      const packageJson = await fetchUrl(`${server.rawBase}/package.json`);
      const pkg = JSON.parse(packageJson);
      
      console.log(`   ✅ Package.json found`);
      console.log(`   📦 Name: ${pkg.name}`);
      console.log(`   📦 Version: ${pkg.version}`);
      console.log(`   📦 Main: ${pkg.main || 'Not specified'}`);
      console.log(`   📦 Scripts: ${Object.keys(pkg.scripts || {}).join(', ') || 'None'}`);
      
      // Check for main entry point
      if (pkg.main) {
        try {
          const mainFile = await fetchUrl(`${server.rawBase}/${pkg.main}`);
          console.log(`   ✅ Main file (${pkg.main}) found`);
          
          // Check for MCP protocol indicators
          const hasMCP = mainFile.includes('@modelcontextprotocol') || 
                        mainFile.includes('MCP') || 
                        mainFile.includes('tools/call') ||
                        mainFile.includes('tools/list');
          
          console.log(`   🔧 MCP Protocol: ${hasMCP ? '✅ Detected' : '❌ Not detected'}`);
        } catch (err) {
          console.log(`   ❌ Main file not accessible: ${err.message}`);
        }
      }
      
      // Check for README
      try {
        const readme = await fetchUrl(`${server.rawBase}/README.md`);
        console.log(`   ✅ README found`);
        
        // Check for setup instructions
        const hasSetup = readme.includes('setup') || readme.includes('install') || readme.includes('config');
        console.log(`   📖 Setup instructions: ${hasSetup ? '✅ Found' : '❌ Missing'}`);
      } catch (err) {
        console.log(`   ❌ README not accessible`);
      }
      
    } else {
      // Mem0 - different format
      console.log(`   ℹ️  Mem0 uses a different format (not GitHub)`);
      console.log(`   🔗 Direct URL: ${server.url}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error analyzing server: ${error.message}`);
  }
}

async function analyzeAllServers() {
  console.log('🚀 MCP Server Analysis Report');
  console.log('=============================');
  
  for (const server of mcpServers) {
    await analyzeMCPServer(server);
  }
  
  console.log('\n📋 Summary & Recommendations');
  console.log('=============================');
  console.log('1. Google Search Console: Check for proper MCP protocol implementation');
  console.log('2. Airtable: Verify API key configuration');
  console.log('3. Supabase: Ensure database connection setup');
  console.log('4. ClickUp: Check authentication flow');
  console.log('5. Mem0: Verify direct integration method');
  
  console.log('\n🔧 Next Steps:');
  console.log('- Add each server to your TypingMind MCP configuration');
  console.log('- Set up required environment variables for each service');
  console.log('- Test each server individually before combining');
}

// Run the analysis
analyzeAllServers().catch(console.error); 