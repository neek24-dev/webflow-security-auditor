// src/scripts/main.ts
import { Webflow } from '@webflow/designer';
import { checkBrokenLinks, runSecurityAudit, monitorResources, setupDeepLink } from './security';
import { getSiteId, makeRequest, displayResults } from './utils';

const webflow = new Webflow({});

async function init() {
  console.log('Initializing Webflow Security Auditor...');
  const siteUrlInput = document.getElementById('siteUrlInput') as HTMLInputElement;
  const checkLinksBtn = document.getElementById('checkLinksBtn');
  const securityAuditBtn = document.getElementById('securityAuditBtn');
  const monitorResourcesBtn = document.getElementById('monitorResourcesBtn');
  const backToDesignerBtn = document.getElementById('back-to-designer');
  const resultsDiv = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const errorDiv = document.getElementById('error');
  const loadingDiv = document.getElementById('loading');
  const toastDiv = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  if (!siteUrlInput || !checkLinksBtn || !securityAuditBtn || !monitorResourcesBtn || !backToDesignerBtn || !resultsDiv || !resultsList || !errorDiv || !loadingDiv || !toastDiv || !toastMessage) {
    console.error('One or more DOM elements not found:', {
      siteUrlInput, checkLinksBtn, securityAuditBtn, monitorResourcesBtn, backToDesignerBtn, resultsDiv, resultsList, errorDiv, loadingDiv, toastDiv, toastMessage
    });
    return;
  }

  const toggleLoading = (show: boolean) => {
    console.log('Toggling loading:', show);
    loadingDiv.classList.toggle('hidden', !show);
    resultsDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
  };

  const showError = (message: string) => {
    console.error('Error:', message);
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
  };

  const showToast = (message: string) => {
    toastMessage.textContent = message;
    toastDiv.classList.remove('hidden');
    setTimeout(() => {
      toastDiv.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
  };

  checkLinksBtn.addEventListener('click', () => {
    console.log('Check for broken links clicked');
    checkBrokenLinks(webflow, resultsDiv, resultsList, toggleLoading, showError).then(() => {
      showToast('Broken links check complete');
    });
  });

  securityAuditBtn.addEventListener('click', () => {
    console.log('Run security audit clicked');
    runSecurityAudit(webflow, siteUrlInput.value, resultsDiv, resultsList, toggleLoading, showError).then(() => {
      showToast('Security audit complete');
    });
  });

  monitorResourcesBtn.addEventListener('click', () => {
    console.log('Monitor external resources clicked');
    monitorResources(webflow, siteUrlInput.value, resultsDiv, resultsList, toggleLoading, showError).then(() => {
      showToast('External resources monitoring complete');
    });
  });

  backToDesignerBtn.addEventListener('click', async () => {
    console.log('Back to Designer clicked');
    try {
      const deepLink = await setupDeepLink(webflow, showError);
      console.log('Navigating to deep link:', deepLink);
      window.location.href = deepLink;
    } catch (error: any) {
      showError('Failed to navigate back to Designer: ' + error.message);
    }
  });
}

init();