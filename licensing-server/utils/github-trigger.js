const https = require('https');

/**
 * Triggers a GitHub Actions workflow via the GitHub API
 * @param {string} token - GitHub Personal Access Token
 * @param {string} owner - Repository owner (username or org)
 * @param {string} repo - Repository name
 * @param {string} workflowId - Workflow file name (e.g., 'build_and_upload.yml')
 * @param {Object} inputs - Optional inputs to pass to the workflow
 * @returns {Promise<Object>} - Response from GitHub API
 */
async function triggerWorkflow(token, owner, repo, workflowId, inputs = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      ref: 'master',
      inputs: inputs
    });

    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'JCS-Photo-Suite-Licensing-Server',
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
        if (res.statusCode === 204) {
          // 204 No Content means success
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          try {
            const responseData = JSON.parse(data);
            resolve({ success: false, statusCode: res.statusCode, data: responseData });
          } catch (e) {
            resolve({ success: false, statusCode: res.statusCode, data: data });
          }
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

module.exports = { triggerWorkflow }; 