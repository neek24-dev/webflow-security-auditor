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
    console.log('Showing toast:', message);
    toastMessage.textContent = message;
    toastDiv.classList.remove('hidden');
    setTimeout(() => {
      toastDiv.classList.add('hidden');
    }, 3000);
  };

  checkLinksBtn.addEventListener('click', async () => {
    console.log('Check for broken links button clicked');
    try {
      await checkBrokenLinks(webflow, resultsDiv, resultsList, toggleLoading, showError);
      showToast('Broken links check complete');
    } catch (error) {
      console.error('Check broken links failed:', error);
    }
  });

  securityAuditBtn.addEventListener('click', async () => {
    console.log('Run security audit clicked');
    try {
      await runSecurityAudit(webflow, siteUrlInput.value, resultsDiv, resultsList, toggleLoading, showError);
      showToast('Security audit complete');
    } catch (error) {
      console.error('Security audit failed:', error);
    }
  });

  monitorResourcesBtn.addEventListener('click', async () => {
    console.log('Monitor external resources clicked');
    try {
      await monitorResources(webflow, siteUrlInput.value, resultsDiv, resultsList, toggleLoading, showError);
      showToast('External resources monitoring complete');
    } catch (error) {
      console.error('Monitor resources failed:', error);
    }
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