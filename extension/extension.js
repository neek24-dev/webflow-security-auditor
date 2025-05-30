// extension/extension.js
const ID_TOKEN = localStorage.getItem('idToken') || 'your-id-token'; // Set after OAuth
const CLIENT_ID = 'your-client-id'; // Replace with your Client ID

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active');
  });
});

// Helper to Display Results
function displayResults(containerId, content) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = content;
}

// Broken Links Feature
async function checkBrokenLinks() {
  const webflowApp = window.WebflowApps?.securityAuditor;
  if (!webflowApp) {
    displayResults('links-results', '<p class="error">Webflow Security Auditor not initialized.</p>');
    return;
  }

  const siteId = webflowApp.siteId; // Hypothetical Webflow SDK property
  const response = await fetch(`http://localhost:3000/links?siteId=${siteId}`, {
    headers: { 'Authorization': `Bearer ${ID_TOKEN}` },
  });
  const links = await response.json();

  const brokenLinks = [];
  for (const link of links) {
    try {
      const linkResponse = await fetch('http://localhost:3000/check-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ID_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: link.url }),
      }).then(res => res.json());

      if (linkResponse.status >= 400) {
        brokenLinks.push({
          url: link.url,
          status: linkResponse.status,
          text: link.text,
        });
      }
    } catch (error) {
      brokenLinks.push({
        url: link.url,
        status: 'Failed',
        text: link.text,
        error: error.message,
      });
    }
  }

  if (brokenLinks.length === 0) {
    displayResults('links-results', '<p>No broken links found.</p>');
  } else {
    const list = brokenLinks.map(link => `
      <li>
        <a href="${link.url}" target="_blank">${link.text}</a> - 
        Status: ${link.status}${link.error ? ` (Error: ${link.error})` : ''}
      </li>
    `).join('');
    displayResults('links-results', `<ul>${list}</ul>`);
  }
}

// Security Audit Feature
async function runSecurityAudit() {
  const webflowApp = window.WebflowApps?.securityAuditor;
  if (!webflowApp) {
    displayResults('security-results', '<p class="error">Webflow Security Auditor not initialized.</p>');
    return;
  }

  const siteId = webflowApp.siteId;
  const response = await fetch(`http://localhost:3000/links?siteId=${siteId}`, {
    headers: { 'Authorization': `Bearer ${ID_TOKEN}` },
  });
  const links = await response.json();

  const issues = [];
  for (const link of links) {
    const auditResponse = await fetch('http://localhost:3000/security-audit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: link.url }),
    }).then(res => res.json());

    if (auditResponse.issues) {
      issues.push(...auditResponse.issues.map(issue => ({ url: link.url, ...issue })));
    }
  }

  if (issues.length === 0) {
    displayResults('security-results', '<p>No security issues found.</p>');
  } else {
    const list = issues.map(issue => `
      <li>
        ${issue.url} - ${issue.type}: ${JSON.stringify(issue.details)}
      </li>
    `).join('');
    displayResults('security-results', `<ul>${list}</ul>`);
  }
}

// External Resources Monitoring
async function monitorResources() {
  const webflowApp = window.WebflowApps?.securityAuditor;
  if (!webflowApp) {
    displayResults('resources-results', '<p class="error">Webflow Security Auditor not initialized.</p>');
    return;
  }

  const siteId = webflowApp.siteId;
  const response = await fetch(`http://localhost:3000/links?siteId=${siteId}`, {
    headers: { 'Authorization': `Bearer ${ID_TOKEN}` },
  });
  const links = await response.json();

  const allResources = [];
  const suspiciousResources = [];
  for (const link of links) {
    const resResponse = await fetch('http://localhost:3000/monitor-resources', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ID_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: link.url }),
    }).then(res => res.json());

    allResources.push(...resResponse.resources.map(res => ({ page: link.url, ...res })));
    suspiciousResources.push(...resResponse.suspicious.map(res => ({ page: link.url, ...res })));
  }

  const resourcesList = allResources.map(res => `
    <li>${res.page} - ${res.type}: ${res.url}</li>
  `).join('');
  const suspiciousList = suspiciousResources.map(res => `
    <li class="error">${res.page} - Suspicious ${res.type}: ${res.url}</li>
  `).join('');
  displayResults('resources-results', `
    <h3>All Resources</h3>
    <ul>${resourcesList}</ul>
    <h3>Suspicious Resources</h3>
    <ul>${suspiciousList}</ul>
  `);
}

// Deep Linking
async function setupDeepLink() {
  const siteId = window.WebflowApps?.securityAuditor?.siteId;
  const response = await fetch(`http://localhost:3000/site-info?siteId=${siteId}`, {
    headers: { 'Authorization': `Bearer ${ID_TOKEN}` },
  });
  const { shortName } = await response.json();
  const deepLink = `webflow://${shortName}/designer?client_id=${CLIENT_ID}`;
  document.getElementById('back-to-designer').addEventListener('click', () => {
    window.location.href = deepLink;
  });
}

// Event Listeners
document.getElementById('check-links').addEventListener('click', checkBrokenLinks);
document.getElementById('run-security-audit').addEventListener('click', runSecurityAudit);
document.getElementById('monitor-resources').addEventListener('click', monitorResources);
setupDeepLink();