// extension/extension.js
import { Webflow } from '@webflow/designer';

const webflow = new Webflow({});

// Utility to get the site ID from the Webflow Designer
async function getSiteId() {
  const site = await webflow.getSite();
  return site.id;
}

// Utility to make API requests to the Data Client
async function makeRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('idToken');
  if (!token) {
    throw new Error('No ID token found. Please authenticate at http://localhost:3000/auth');
  }

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`http://localhost:3000${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// Utility to display results
function displayResults(results, listElement) {
  listElement.innerHTML = '';
  if (results.length === 0) {
    const li = document.createElement('li');
    li.className = 'text-gray-600 italic';
    li.textContent = 'No issues found.';
    listElement.appendChild(li);
    return;
  }

  results.forEach(item => {
    const li = document.createElement('li');
    li.className = 'p-2 bg-white rounded-md shadow-sm';
    if (typeof item === 'string') {
      li.textContent = item;
    } else if (item.url) {
      li.innerHTML = `<span class="font-medium">URL:</span> ${item.url} ${
        item.status ? `<span class="text-red-600">(Status: ${item.status})</span>` : ''
      } ${item.text ? `<span class="text-gray-600">(${item.text})</span>` : ''}`;
    } else if (item.type) {
      li.innerHTML = `<span class="font-medium">Issue:</span> ${item.type} - ${item.details.join(', ')}`;
    } else if (item.resources) {
      li.innerHTML = `<span class="font-medium">Resources:</span> ${item.resources.length} found, ${
        item.suspicious.length
      } suspicious (${item.suspicious.map(r => `${r.type}: ${r.url}`).join(', ')})`;
    }
    listElement.appendChild(li);
  });
}

// Main function to set up the app
async function init() {
  const checkLinksBtn = document.getElementById('checkLinksBtn');
  const securityAuditBtn = document.getElementById('securityAuditBtn');
  const monitorResourcesBtn = document.getElementById('monitorResourcesBtn');
  const backToDesignerBtn = document.getElementById('back-to-designer');
  const resultsDiv = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const errorDiv = document.getElementById('error');
  const loadingDiv = document.getElementById('loading');

  // Utility to show/hide loading state
  const toggleLoading = (show) => {
    loadingDiv.classList.toggle('hidden', !show);
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
  };

  // Utility to show error
  const showError = (message) => {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
  };

  // Check Broken Links
  checkLinksBtn.addEventListener('click', async () => {
    try {
      toggleLoading(true);
      const siteId = await getSiteId();
      const links = await makeRequest(`/links?siteId=${siteId}`);
      const brokenLinks = [];
      for (const link of links) {
        const result = await makeRequest('/check-link', 'POST', { url: link.url });
        if (result.status >= 400) {
          brokenLinks.push({ ...link, status: result.status });
        }
      }
      toggleLoading(false);
      resultsDiv.classList.remove('hidden');
      displayResults(brokenLinks, resultsList);
    } catch (error) {
      toggleLoading(false);
      showError(error.message);
    }
  });

  // Run Security Audit
  securityAuditBtn.addEventListener('click', async () => {
    try {
      toggleLoading(true);
      const siteId = await getSiteId();
      const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
      const shortName = siteInfo.shortName;
      const url = `https://${shortName}.webflow.io`;
      const audit = await makeRequest('/security-audit', 'POST', { url });
      toggleLoading(false);
      resultsDiv.classList.remove('hidden');
      displayResults(audit.issues, resultsList);
    } catch (error) {
      toggleLoading(false);
      showError(error.message);
    }
  });

  // Monitor External Resources
  monitorResourcesBtn.addEventListener('click', async () => {
    try {
      toggleLoading(true);
      const siteId = await getSiteId();
      const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
      const shortName = siteInfo.shortName;
      const url = `https://${shortName}.webflow.io`;
      const resources = await makeRequest('/monitor-resources', 'POST', { url });
      toggleLoading(false);
      resultsDiv.classList.remove('hidden');
      displayResults([resources], resultsList);
    } catch (error) {
      toggleLoading(false);
      showError(error.message);
    }
  });

  // Deep Linking
  backToDesignerBtn.addEventListener('click', async () => {
    try {
      const siteId = await getSiteId();
      const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
      const shortName = siteInfo.shortName;
      const deepLink = `webflow://${shortName}/designer?client_id=YOUR_CLIENT_ID`;
      window.location.href = deepLink;
    } catch (error) {
      showError('Failed to navigate back to Designer: ' + error.message);
    }
  });
}

init();