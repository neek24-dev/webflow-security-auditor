// src/scripts/monitoring.js
import { SEVERITY } from './constants.js';
import { updateBadge, showToast } from './ui.js';
import { detectImplementedHeaders } from './security.js';
import { crawlSiteForBrokenLinks } from './links.js';

export function detectChanges(newResults, section) {
  const lastResults = window.lastScanResults[section];
  const newIssues = newResults.filter(newIssue => 
    !lastResults.some(oldIssue => 
      oldIssue.title === newIssue.title && 
      oldIssue.description === newIssue.description && 
      oldIssue.location === newIssue.location
    )
  );
  const resolvedIssues = lastResults.filter(oldIssue => 
    !newResults.some(newIssue => 
      newIssue.title === oldIssue.title && 
      newIssue.description === newIssue.description && 
      oldIssue.location === oldIssue.location
    )
  );
  const changes = [
    ...newIssues.map(issue => ({ ...issue, type: 'New Issue', status: 'Detected' })),
    ...resolvedIssues.map(issue => ({ ...issue, type: 'Resolved Issue', status: 'No longer present' }))
  ];
  window.lastScanResults[section] = [...newResults];
  return { newIssues, resolvedIssues, changes };
}

export async function monitorVulnerabilities() {
  if (!window.isMonitoring) {
    return;
  }

  let customCodeIssues = [];
  let resourcesIssues = [];
  let headersIssues = [];
  let brokenLinksIssues = [];

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
      customCodeIssues.push({
        severity: SEVERITY.Informational,
        title: 'No Custom Code Found',
        description: 'No custom code detected in head, footer, or page embeds.',
        location: 'Site-wide',
        remediation: 'No action needed.'
      });
    } else {
      if (customCode.includes('eval(')) {
        customCodeIssues.push({
          severity: SEVERITY.High,
          title: 'Use of eval() Detected',
          description: 'The eval() function can execute arbitrary code, leading to XSS vulnerabilities.',
          snippet: customCode.match(/eval\([^)]+\)/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Replace eval() with safer alternatives like JSON.parse or structured data handling.'
        });
      }
      if (customCode.includes('innerHTML')) {
        customCodeIssues.push({
          severity: SEVERITY.High,
          title: 'Use of innerHTML Detected',
          description: 'Unescaped innerHTML can lead to XSS if user input is involved.',
          snippet: customCode.match(/\.innerHTML\s*=\s*[^;]+/g)?.[0] || '',
          location: 'Custom Code',
          remediation: 'Use textContent or sanitize inputs with a library like DOMPurify.'
        });
      }
    }

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
      resourcesIssues.push({
        severity: safety === 'Malicious' ? SEVERITY.High : SEVERITY.Informational,
        title: `External ${resource.type}: ${domain}`,
        description: `Found ${resource.type.toLowerCase()} from ${resource.url}. Safety: ${safety}.`,
        location: `Page: ${resource.page}`,
        remediation: safety === 'Malicious' ? 'Remove or replace with a trusted source.' : 'Verify the source’s legitimacy.'
      });
    });

    const implementedHeaders = await detectImplementedHeaders();
    const headers = [
      { name: 'Content-Security-Policy', severity: SEVERITY.Informational, description: 'Restricts resources the browser can load, reducing XSS risks.', remediation: 'Add via meta tag: <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' https://cdn.jsdelivr.net https://unpkg.com; style-src \'self\'; img-src \'self\' data:; frame-src \'none\';"> or request Webflow to set header.', location: 'Site-wide (HTTP Header or Meta)' },
      { name: 'X-Frame-Options', severity: SEVERITY.Informational, description: 'Prevents clickjacking by controlling iframe embedding.', remediation: 'Request Webflow to set: X-Frame-Options: DENY.', location: 'Site-wide (HTTP Header)' }
    ];
    headers.forEach(header => {
      const implemented = implementedHeaders.find(h => h.name === header.name);
      headersIssues.push({
        severity: header.severity,
        title: header.name,
        description: header.description,
        location: header.location,
        status: implemented ? `Implemented (${implemented.type}: ${implemented.value})` : 'Not implemented',
        remediation: implemented ? 'No further action needed.' : header.remediation
      });
    });

    try {
      const siteInfo = await window.WebflowApps.getSiteInfo();
      const startUrl = siteInfo?.domain || siteInfo?.publishedDomains?.[0] ? `https://${siteInfo.domain || siteInfo.publishedDomains[0]}` : null;
      if (startUrl) {
        brokenLinksIssues = await crawlSiteForBrokenLinks(startUrl);
      } else {
        console.warn('Skipping broken link check: Unable to determine site URL during monitoring.');
      }
    } catch (error) {
      console.error('Error checking broken links during monitoring:', error);
    }

    const codeChanges = detectChanges(customCodeIssues, 'customCode');
    const resourcesChanges = detectChanges(resourcesIssues, 'resources');
    const headersChanges = detectChanges(headersIssues, 'headers');
    const brokenLinksChanges = detectChanges(brokenLinksIssues, 'brokenLinks');

    updateBadge('code', codeChanges.newIssues.length);
    updateBadge('resources', resourcesChanges.newIssues.length);
    updateBadge('headers', headersChanges.newIssues.length);
    updateBadge('brokenLinks', brokenLinksChanges.newIssues.length);

    const totalNewIssues = codeChanges.newIssues.length + resourcesChanges.newIssues.length + headersChanges.newIssues.length + brokenLinksChanges.newIssues.length;
    if (totalNewIssues > 0) {
      const allChanges = [
        ...codeChanges.changes,
        ...resourcesChanges.changes,
        ...headersChanges.changes,
        ...brokenLinksChanges.changes
      ];
      showToast(`${totalNewIssues} new issue${totalNewIssues > 1 ? 's' : ''} detected!`, allChanges);
    }
  } catch (error) {
    console.error('Error during monitoring:', error);
  }
}

export function toggleMonitoring() {
  const toggleBtn = document.getElementById('monitorToggleBtn');
  window.isMonitoring = !window.isMonitoring;
  toggleBtn.textContent = window.isMonitoring ? 'Disable Monitoring' : 'Enable Monitoring';
  toggleBtn.classList.toggle('bg-blue-500', !window.isMonitoring);
  toggleBtn.classList.toggle('bg-red-500', window.isMonitoring);
  if (window.isMonitoring) {
    window.monitoringInterval = setInterval(monitorVulnerabilities, 60000);
    monitorVulnerabilities();
  } else {
    clearInterval(window.monitoringInterval);
    updateBadge('code', 0);
    updateBadge('resources', 0);
    updateBadge('headers', 0);
    updateBadge('brokenLinks', 0);
  }
}