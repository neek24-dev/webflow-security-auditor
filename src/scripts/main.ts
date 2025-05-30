// src/scripts/main.js
import { debounce } from './utils.js';
import { resizeIframe, displayResults } from './ui.js';
import { analyzeCustomCode, auditExternalResources, recommendSecurityHeaders } from './security.js';
import { checkBrokenLinks } from './links.js';
import { toggleMonitoring } from './monitoring.js';

// Global variables
window.WebflowApps = window.WebflowApps;
window.trustedDomains = ['cdn.jsdelivr.net', 'unpkg.com'];
window.maliciousDomains = ['example-malicious.com'];
window.issues = [];
window.lastScanResults = { customCode: [], resources: [], headers: [], brokenLinks: [] };
window.isMonitoring = false;
window.monitoringInterval = null;
window.recommendedHeaders = [];
window.visitedUrls = new Set();
window.urlsToVisit = [];
window.brokenLinksReport = [];
window.debouncedResizeIframe = debounce(resizeIframe, 100);
window.axios = window.axios; // Provided by CDN
window.cheerio = window.cheerio; // Provided by CDN
window.escapeHTML = window.escapeHTML; // Will be set by the bundle

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('text-blue-600', 'border-blue-600');
        t.classList.add('text-gray-600');
      });
      tab.classList.add('text-blue-600', 'border-blue-600');
      
      if (tab.id === 'tabCode') analyzeCustomCode();
      else if (tab.id === 'tabResources') auditExternalResources();
      else if (tab.id === 'tabHeaders') recommendSecurityHeaders();
      else if (tab.id === 'tabBrokenLinks') checkBrokenLinks();
    });
  });
}

function setupResizeObserver() {
  const resultsDiv = document.getElementById('results');
  const observer = new ResizeObserver(() => {
    window.debouncedResizeIframe();
  });
  observer.observe(resultsDiv);
  observer.observe(document.body);
}

function setupMutationObserver() {
  const targetNode = document.getElementById('resultsContent');
  const config = { childList: true, subtree: true, characterData: true };
  const callback = () => {
    window.debouncedResizeIframe();
  };
  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
}

async function runFullScan() {
  window.issues = [];
  await analyzeCustomCode();
  window.issues = [...window.issues];
  await auditExternalResources();
  window.issues = [...window.issues];
  await recommendSecurityHeaders();
  window.issues = [...window.issues];
  await checkBrokenLinks();
  window.issues = [...window.issues];
  displayResults(window.issues, 'full scan');
  document.getElementById('tabBrokenLinks').click();
}

function setupEventListeners() {
  const runScanBtn = document.getElementById('runScanBtn');
  const injectHeadersBtn = document.getElementById('injectHeadersBtn');
  const injectAllHeadersBtn = document.getElementById('injectAllHeadersBtn');
  const checkBrokenLinksBtn = document.getElementById('checkBrokenLinksBtn');
  const severityFilter = document.getElementById('severityFilter');
  const sortIssuesBtn = document.getElementById('sortIssuesBtn');
  const monitorToggleBtn = document.getElementById('monitorToggleBtn');

  if (runScanBtn) {
    runScanBtn.addEventListener('click', runFullScan);
  } else {
    console.error('runScanBtn not found in DOM');
  }

  if (injectHeadersBtn) {
    injectHeadersBtn.addEventListener('click', window.injectSecurityHeaders);
  } else {
    console.error('injectHeadersBtn not found in DOM');
  }

  if (injectAllHeadersBtn) {
    injectAllHeadersBtn.addEventListener('click', window.injectAllRecommendedHeaders);
  } else {
    console.error('injectAllHeadersBtn not found in DOM');
  }

  if (checkBrokenLinksBtn) {
    checkBrokenLinksBtn.addEventListener('click', () => {
      console.log('Scan for Broken Links button clicked');
      checkBrokenLinks();
    });
  } else {
    console.error('checkBrokenLinksBtn not found in DOM');
  }

  if (severityFilter) {
    severityFilter.addEventListener('change', () => displayResults(window.issues, 'filtered'));
  } else {
    console.error('severityFilter not found in DOM');
  }

  if (sortIssuesBtn) {
    sortIssuesBtn.addEventListener('click', () => {
      document.getElementById('sortIssuesBtn').dataset.sorted = 'true';
      displayResults(window.issues, 'sorted');
    });
  } else {
    console.error('sortIssuesBtn not found in DOM');
  }

  if (monitorToggleBtn) {
    monitorToggleBtn.addEventListener('click', toggleMonitoring);
  } else {
    console.error('monitorToggleBtn not found in DOM');
  }

  window.addEventListener('resize', window.debouncedResizeIframe);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  if (!window.WebflowApps) {
    console.error('Webflow SDK not loaded');
    document.getElementById('resultsContent').innerHTML = 
      '<p class="text-red-600">Webflow Apps SDK not loaded. Ensure the app is running in the Webflow Designer.</p>';
    return;
  }
  setupTabs();
  setupEventListeners();
  setupResizeObserver();
  setupMutationObserver();
  document.getElementById('tabCode').click();
  window.debouncedResizeIframe();
});