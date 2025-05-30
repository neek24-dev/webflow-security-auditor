import { SEVERITY } from './constants.js';
import { displayResults } from './ui.js';

export async function analyzeCustomCode() {
  const resultsDiv = document.getElementById('resultsContent');
  const progressDiv = document.getElementById('progress');
  progressDiv.classList.remove('hidden');
  progressDiv.textContent = 'Analyzing custom code...';
  window.issues = [];

  try {
    const siteData = await window.WebflowApps.getSiteCustomCode();
    const pages = await window.WebflowApps.getAllPages();
    let customCode = (siteData?.head || '') + (siteData?.footer || '');

    pages.forEach(page => {
      if (page.customEmbeds) {
        customCode += page.customEmbeds.join('');
      }
    });

    if (!customCode) {
      window.issues.push({
        severity: SEVERITY.Informational,
        title: 'No Custom Code Found',
        description: 'No custom code detected in head, footer, or page embeds.',
        location: 'Site-wide',
        remediation: 'No action needed.'
      });
    } else {
      if (customCode.includes('eval(')) {
        window.issues.push({
          severity: SEVERITY.High,
          title: 'Use of eval() Detected',
          description: 'The eval() function can execute arbitrary code, leading to XSS vulnerabilities.',
          snippet: customCode.match(/eval\([^)]+\)/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Replace eval() with safer alternatives like JSON.parse or structured data handling.'
        });
      }
      if (customCode.includes('document.write(')) {
        window.issues.push({
          severity: SEVERITY.Medium,
          title: 'Use of document.write() Detected',
          description: 'document.write() can cause performance issues and potential XSS risks.',
          snippet: customCode.match(/document\.write\([^)]+\)/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Use DOM manipulation methods like appendChild or innerText instead.'
        });
      }
      if (customCode.includes('innerHTML')) {
        window.issues.push({
          severity: SEVERITY.High,
          title: 'Use of innerHTML Detected',
          description: 'Unescaped innerHTML can lead to XSS if user input is involved.',
          snippet: customCode.match(/\.innerHTML\s*=\s*[^;]+/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Use textContent or sanitize inputs with a library like DOMPurify.'
        });
      }
      if (customCode.includes('createElement("script")') || customCode.includes('createElement("iframe")')) {
        window.issues.push({
          severity: SEVERITY.Medium,
          title: 'Dynamic Script/Iframe Creation Detected',
          description: 'Dynamically created scripts or iframes from untrusted sources can introduce vulnerabilities.',
          snippet: customCode.match(/createElement\(['"]script['"]\)|createElement\(['"]iframe['"]\)/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Validate and sanitize source URLs or avoid dynamic element creation.'
        });
      }
      if (customCode.includes('window.location')) {
        window.issues.push({
          severity: SEVERITY.Medium,
          title: 'URL Manipulation Detected',
          description: 'Unvalidated window.location changes can lead to open redirects.',
          snippet: customCode.match(/window\.location\s*=\s*[^;]+/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Validate URLs before redirection and use trusted domains.'
        });
      }
      if (customCode.includes('atob(') || customCode.match(/base64/)) {
        window.issues.push({
          severity: SEVERITY.Medium,
          title: 'Potential Obfuscated Code Detected',
          description: 'Base64 or obfuscated code may hide malicious intent.',
          snippet: customCode.match(/atob\([^)]+\)|base64/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Review and decode obfuscated code to ensure it’s safe.'
        });
      }
      const eventHandlers = customCode.match(/on(click|mouseover|keydown|submit)\s*=\s*['"][^'"]+['"]/g);
      if (eventHandlers) {
        window.issues.push({
          severity: SEVERITY.Low,
          title: 'Inline Event Handlers Detected',
          description: 'Inline event handlers (e.g., onclick) can be prone to injection if dynamic.',
          snippet: eventHandlers[0],
          location: 'Custom Code',
          remediation: 'Move event handlers to external JavaScript with addEventListener.'
        });
      }
    }

    window.lastScanResults.customCode = [...window.issues];
    displayResults(window.issues, 'custom code');
  } catch (error) {
    console.error('Error analyzing custom code:', error);
    resultsDiv.innerHTML = '<p class="text-red-600">Error analyzing custom code. Please try again.</p>';
  } finally {
    progressDiv.classList.add('hidden');
  }
}

export async function auditExternalResources() {
  const resultsDiv = document.getElementById('resultsContent');
  const progressDiv = document.getElementById('progress');
  progressDiv.classList.remove('hidden');
  progressDiv.textContent = 'Auditing external resources...';
  window.issues = [];

  try {
    const pages = await window.WebflowApps.getAllPages();
    const resources = [];

    pages.forEach(page => {
      const elements = page.elements || [];
      elements.forEach(el => {
        if (el.src && (el.type === 'script' || el.type === 'link' || el.type === 'img' || el.type === 'iframe')) {
          resources.push({
            url: el.src,
            type: el.type.charAt(0).toUpperCase() + el.type.slice(1),
            page: page.name
          });
        }
      });
    });

    resources.forEach(resource => {
      const domain = new URL(resource.url).hostname;
      let safety = 'Unknown';
      if (window.trustedDomains.includes(domain)) {
        safety = 'Trusted';
      } else if (window.maliciousDomains.includes(domain)) {
        safety = 'Malicious';
      }

      window.issues.push({
        severity: safety === 'Malicious' ? SEVERITY.High : SEVERITY.Informational,
        title: `External ${resource.type}: ${domain}`,
        description: `Found ${resource.type.toLowerCase()} from ${resource.url}. Safety: ${safety}.`,
        location: `Page: ${resource.page}`,
        remediation: safety === 'Malicious' ? 'Remove or replace with a trusted source.' : 'Verify the source’s legitimacy.'
      });

      if ((resource.type === 'Script' || resource.type === 'Link') && !resource.integrity) {
        window.issues.push({
          severity: SEVERITY.Medium,
          title: `Missing SRI for ${resource.type}`,
          description: `Subresource Integrity (SRI) is not defined for ${resource.url}.`,
          location: `Page: ${resource.page}`,
          remediation: 'Add an integrity attribute with a hash (e.g., sha256) to ensure resource integrity.'
        });
      }
    });

    window.lastScanResults.resources = [...window.issues];
    displayResults(window.issues, 'external resource');
  } catch (error) {
    console.error('Error auditing resources:', error);
    resultsDiv.innerHTML = '<p class="text-red-600">Error auditing resources. Please try again.</p>';
  } finally {
    progressDiv.classList.add('hidden');
  }
}

export async function injectSecurityHeaders() {
  const resultsDiv = document.getElementById('resultsContent');
  const progressDiv = document.getElementById('progress');
  progressDiv.classList.remove('hidden');
  progressDiv.textContent = 'Injecting security headers...';

  try {
    const headerCode = `Your header code here`;
    // Example: Display the header code in the results div
    resultsDiv.innerHTML = `<pre class="bg-gray-100 p-2 rounded">${headerCode}</pre>`;
    progressDiv.classList.add('hidden');
  } catch (error) {
    console.error('Error injecting security headers:', error);
    resultsDiv.innerHTML = '<p class="text-red-600">Error injecting security headers. Please try again.</p>';
    progressDiv.classList.add('hidden');
  }
}