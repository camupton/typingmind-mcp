const https = require('https');
const querystring = require('querystring');

/**
 * Middleware to verify authentication token
 * @param {string} authToken The token to check against
 * @returns {Function} Express middleware function
 */
function authMiddleware(authToken) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ error: 'Authorization header is required' });
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer') {
      return res
        .status(401)
        .json({ error: 'Authorization type must be Bearer' });
    }

    if (token !== authToken) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    next();
  };
}

/**
 * Google OAuth helper functions for Google Ads API access
 */

/**
 * Generates the OAuth authorization URL
 * @param {string} clientId - Google OAuth client ID
 * @param {string} redirectUri - Redirect URI (must match Google Console config)
 * @param {Array} scopes - Array of OAuth scopes
 * @returns {string} Authorization URL
 */
function generateAuthUrl(clientId, redirectUri = 'urn:ietf:wg:oauth:2.0:oob', scopes = ['https://www.googleapis.com/auth/adwords']) {
  const params = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent'
  };
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(params)}`;
}

/**
 * Exchanges authorization code for access token
 * @param {string} code - Authorization code from OAuth flow
 * @param {string} clientId - Google OAuth client ID
 * @param {string} clientSecret - Google OAuth client secret
 * @param {string} redirectUri - Redirect URI (must match the one used in auth)
 * @returns {Promise<Object>} Token response with access_token and refresh_token
 */
function exchangeCodeForToken(code, clientId, clientSecret, redirectUri = 'urn:ietf:wg:oauth:2.0:oob') {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(`OAuth error: ${response.error} - ${response.error_description}`));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(new Error(`Failed to parse token response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Token exchange failed: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Refreshes an access token using a refresh token
 * @param {string} refreshToken - Refresh token from previous OAuth flow
 * @param {string} clientId - Google OAuth client ID
 * @param {string} clientSecret - Google OAuth client secret
 * @returns {Promise<Object>} Token response with new access_token
 */
function refreshAccessToken(refreshToken, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(`Token refresh error: ${response.error} - ${response.error_description}`));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(new Error(`Failed to parse refresh response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Token refresh failed: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Gets a valid access token (either from env or by refreshing)
 * @returns {Promise<string>} Valid access token
 */
async function getValidAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  // If we have a refresh token, try to refresh the access token
  if (refreshToken) {
    try {
      const response = await refreshAccessToken(refreshToken, clientId, clientSecret);
      return response.access_token;
    } catch (error) {
      console.warn('Failed to refresh token:', error.message);
    }
  }

  // If we have a current access token, return it
  if (accessToken) {
    return accessToken;
  }

  throw new Error('No valid access token available. Please complete OAuth flow first.');
}

module.exports = {
  authMiddleware,
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidAccessToken
};
