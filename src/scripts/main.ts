// src/scripts/main.ts
import { Webflow } from '@webflow/designer';
import { checkBrokenLinks, runSecurityAudit, monitorResources, setupDeepLink } from './security';
import { getSiteId, makeRequest, displayResults } from './utils';

const webflow = new Webflow({});

async function init() {
  // DOM elements
  const checkLinksBtn = document.getElementById('checkLinksBtn');
  const securityAuditBtn = document.getElementById('securityAuditBtn');
  const monitorResourcesBtn = document.getElementById('monitorResourcesBtn');
  const backToDesignerBtn = document.getElementById('back-to-designer');
  const resultsDiv = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const errorDiv = document.getElementById('error');
  const loadingDiv = document.getElementById('loading');

  // Validate DOM elements
  if (!checkLinksBtn || !securityAuditBtn || !monitorResourcesBtn || !backToDesignerBtn || !resultsDiv || !resultsList || !errorDiv || !loadingDiv) {
    console.error('One or more DOM elements not found');
    return;
  }

  // Utility to show/hide loading state
  const toggleLoading = (show: boolean) => {
    loadingDiv.classList.toggle('hidden', !show);
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
  };

  // Utility to show error
  const showError = (message: string) => {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
  };

  // Event listeners for buttons
  checkLinksBtn.addEventListener('click', () =>
    checkBrokenLinks(webflow, resultsDiv, resultsList, toggleLoading, showError)
  );

  securityAuditBtn.addEventListener('click', () =>
    runSecurityAudit(webflow, resultsDiv, resultsList, toggleLoading, showError)
  );

  monitorResourcesBtn.addEventListener('click', () =>
    monitorResources(webflow, resultsDiv, resultsList, toggleLoading, showError)
  );

  backToDesignerBtn.addEventListener('click', async () => {
    try {
      const deepLink = await setupDeepLink(webflow, showError);
      window.location.href = deepLink;
    } catch (error: any) {
      showError('Failed to navigate back to Designer: ' + error.message);
    }
  });
}

// Run initialization
init();