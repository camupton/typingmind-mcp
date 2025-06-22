/**
 * ClickUp API v2 integration for task management
 * Creates and manages tasks for automated workflow management
 */

const https = require('https');

// Default ClickUp Space ID for Contractor Scale
const DEFAULT_SPACE_ID = '6942940';

/**
 * Creates a task in ClickUp using API v2
 * @param {Object} taskData - Task creation parameters
 * @param {string} taskData.title - Task title (e.g., "Ad Audit – Week {ISO Week}")
 * @param {string} taskData.description - Task description/body content
 * @param {string} taskData.listId - ClickUp list ID where task should be created
 * @param {string} taskData.spaceId - ClickUp space ID (optional, defaults to 6942940)
 * @param {Array} taskData.tags - Array of tags to apply to the task
 * @param {string} taskData.assigneeId - User ID to assign the task to
 * @param {string} taskData.dueDate - Due date in ISO format
 * @returns {Promise<Object>} Created task data or error information
 */
async function createTask(taskData) {
  const clickupToken = process.env.CLICKUP_TOKEN;
  
  if (!clickupToken) {
    throw new Error('CLICKUP_TOKEN environment variable is required');
  }

  if (!taskData.title || !taskData.listId) {
    throw new Error('Task title and listId are required');
  }

  // Use default space ID if not provided
  const spaceId = taskData.spaceId || DEFAULT_SPACE_ID;

  // Get current ISO week for default title formatting
  const getISOWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil(days / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  // Format title with ISO week if not provided
  const title = taskData.title.includes('{ISO Week}') 
    ? taskData.title.replace('{ISO Week}', getISOWeek())
    : taskData.title;

  const payload = {
    name: title,
    description: taskData.description || '',
    status: 'to do',
    priority: taskData.priority || 3, // 1=urgent, 2=high, 3=normal, 4=low
    due_date: taskData.dueDate ? new Date(taskData.dueDate).getTime() : null,
    assignees: taskData.assigneeId ? [taskData.assigneeId] : [],
    tags: taskData.tags || []
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.clickup.com',
      port: 443,
      path: `/api/v2/list/${taskData.listId}/task`,
      method: 'POST',
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              task: response,
              taskId: response.id,
              taskUrl: response.url,
              message: 'Task created successfully'
            });
          } else {
            resolve({
              success: false,
              error: response.err || 'Failed to create task',
              statusCode: res.statusCode,
              response: response
            });
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Creates an Ad Audit task with recommendations from Google Ads analysis
 * @param {Object} auditData - Audit data from Google Ads analysis
 * @param {Array} auditData.recommendations - Array of recommendations from Google Ads analysis
 * @param {Object} auditData.dataPoints - Summary data points
 * @param {string} auditData.listId - ClickUp list ID for the task
 * @param {string} auditData.assigneeId - User ID to assign the task to (optional)
 * @returns {Promise<Object>} Created task result
 */
async function createAdAuditTask(auditData) {
  if (!auditData.recommendations || auditData.recommendations.length === 0) {
    return {
      success: false,
      message: 'No recommendations to create task for'
    };
  }

  const description = formatAuditDescription(auditData);
  
  const taskData = {
    title: `Ad Audit – Week ${getISOWeek()}`,
    description: description,
    listId: auditData.listId,
    assigneeId: auditData.assigneeId,
    tags: ['ad-audit', 'automated', 'google-ads'],
    priority: 2, // High priority for audit tasks
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Due in 7 days
  };

  return await createTask(taskData);
}

/**
 * Searches ClickUp for tasks and docs using natural language queries
 * @param {Object} searchOptions - Search parameters
 * @param {string} searchOptions.query - Natural language search query
 * @param {string} searchOptions.spaceId - Space ID to search in (defaults to 6942940)
 * @param {string} searchOptions.type - Type of search: 'tasks', 'docs', or 'all'
 * @param {number} searchOptions.limit - Maximum number of results (default: 20)
 * @returns {Promise<Object>} Search results
 */
async function searchClickUp(searchOptions = {}) {
  const clickupToken = process.env.CLICKUP_TOKEN;
  
  if (!clickupToken) {
    throw new Error('CLICKUP_TOKEN environment variable is required');
  }

  const { query, spaceId = DEFAULT_SPACE_ID, type = 'all', limit = 20 } = searchOptions;

  if (!query) {
    throw new Error('Search query is required');
  }

  const results = {
    tasks: [],
    docs: [],
    totalResults: 0,
    query: query,
    spaceId: spaceId
  };

  try {
    // Search for tasks
    if (type === 'all' || type === 'tasks') {
      const taskResults = await searchTasks(spaceId, query, limit);
      results.tasks = taskResults;
    }

    // Search for docs
    if (type === 'all' || type === 'docs') {
      const docResults = await searchDocs(spaceId, query, limit);
      results.docs = docResults;
    }

    results.totalResults = results.tasks.length + results.docs.length;

    return {
      success: true,
      results: results
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      results: results
    };
  }
}

/**
 * Searches for tasks in ClickUp
 * @param {string} spaceId - Space ID to search in
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Task search results
 */
async function searchTasks(spaceId, query, limit) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clickup.com',
      port: 443,
      path: `/api/v2/space/${spaceId}/task?search=${encodeURIComponent(query)}&limit=${limit}`,
      method: 'GET',
      headers: {
        'Authorization': process.env.CLICKUP_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const tasks = response.tasks || [];
            resolve(tasks.map(task => ({
              id: task.id,
              name: task.name,
              description: task.description,
              status: task.status?.status,
              priority: task.priority,
              dueDate: task.due_date,
              assignees: task.assignees,
              tags: task.tags,
              url: task.url,
              type: 'task'
            })));
          } else {
            resolve([]);
          }
        } catch (parseError) {
          resolve([]);
        }
      });
    });

    req.on('error', (error) => {
      resolve([]);
    });

    req.end();
  });
}

/**
 * Searches for docs in ClickUp
 * @param {string} spaceId - Space ID to search in
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Doc search results
 */
async function searchDocs(spaceId, query, limit) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clickup.com',
      port: 443,
      path: `/api/v2/space/${spaceId}/doc?search=${encodeURIComponent(query)}&limit=${limit}`,
      method: 'GET',
      headers: {
        'Authorization': process.env.CLICKUP_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const docs = response.docs || [];
            resolve(docs.map(doc => ({
              id: doc.id,
              name: doc.name,
              content: doc.content,
              url: doc.url,
              type: 'doc'
            })));
          } else {
            resolve([]);
          }
        } catch (parseError) {
          resolve([]);
        }
      });
    });

    req.on('error', (error) => {
      resolve([]);
    });

    req.end();
  });
}

/**
 * Gets all lists in the default space
 * @param {string} spaceId - Space ID (defaults to 6942940)
 * @returns {Promise<Array>} List of lists
 */
async function getLists(spaceId = DEFAULT_SPACE_ID) {
  const clickupToken = process.env.CLICKUP_TOKEN;
  
  if (!clickupToken) {
    throw new Error('CLICKUP_TOKEN environment variable is required');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clickup.com',
      port: 443,
      path: `/api/v2/space/${spaceId}/list`,
      method: 'GET',
      headers: {
        'Authorization': clickupToken
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              lists: response.lists || []
            });
          } else {
            resolve({
              success: false,
              error: response.err || 'Failed to fetch lists',
              lists: []
            });
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Formats audit data into a readable task description
 * @param {Object} auditData - Audit data from Google Ads analysis
 * @returns {string} Formatted description for ClickUp task
 */
function formatAuditDescription(auditData) {
  let description = `## Google Ads Audit Report\n\n`;
  description += `**Analysis Date:** ${auditData.analysisDate || new Date().toISOString()}\n\n`;
  
  if (auditData.dataPoints) {
    description += `### Data Summary\n`;
    description += `- Total Leads: ${auditData.dataPoints.totalLeads}\n`;
    description += `- Total Search Terms: ${auditData.dataPoints.totalSearchTerms}\n`;
    description += `- Total Campaigns: ${auditData.dataPoints.totalCampaigns}\n\n`;
  }

  description += `### Recommendations\n`;
  auditData.recommendations.forEach((rec, index) => {
    description += `${index + 1}. ${rec}\n`;
  });

  description += `\n---\n*Task created automatically by Contractor Scale AI Media Assistant*`;
  
  return description;
}

/**
 * Gets current ISO week number
 * @returns {string} ISO week in format YYYY-WNN
 */
function getISOWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil(days / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Fetches task context from ClickUp (for future use in AI queries)
 * @param {string} taskId - ClickUp task ID
 * @returns {Promise<Object>} Task data and context
 */
async function getTaskContext(taskId) {
  const clickupToken = process.env.CLICKUP_TOKEN;
  
  if (!clickupToken) {
    throw new Error('CLICKUP_TOKEN environment variable is required');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clickup.com',
      port: 443,
      path: `/api/v2/task/${taskId}`,
      method: 'GET',
      headers: {
        'Authorization': clickupToken
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              task: response,
              context: {
                title: response.name,
                description: response.description,
                status: response.status.status,
                priority: response.priority,
                assignees: response.assignees,
                tags: response.tags,
                dueDate: response.due_date,
                createdAt: response.date_created,
                updatedAt: response.date_updated
              }
            });
          } else {
            resolve({
              success: false,
              error: response.err || 'Failed to fetch task',
              statusCode: res.statusCode
            });
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

module.exports = {
  createTask,
  createAdAuditTask,
  searchClickUp,
  getLists,
  getTaskContext,
  getISOWeek,
  DEFAULT_SPACE_ID
}; 