// src/scripts/security.ts
import { getSiteId, makeRequest, displayResults } from './utils';

export async function checkBrokenLinks(webflow: any, resultsDiv: HTMLElement, resultsList: HTMLElement, toggleLoading: (show: boolean) => void, showError: (message: string) => void) {
  try {
    toggleLoading(true);
    const siteId = await getSiteId(webflow);
    const links = await makeRequest(`/links?siteId=${siteId}`);
    const brokenLinks: any[] = [];
    for (const link of links) {
      const result = await makeRequest('/check-link', 'POST', { url: link.url });
      if (result.status >= 400) {
        brokenLinks.push({ ...link, status: result.status });
      }
    }
    toggleLoading(false);
    resultsDiv.classList.remove('hidden');
    displayResults(brokenLinks, resultsList);
  } catch (error: any) {
    toggleLoading(false);
    showError(error.message);
  }
}

export async function runSecurityAudit(webflow: any, resultsDiv: HTMLElement, resultsList: HTMLElement, toggleLoading: (show: boolean) => void, showError: (message: string) => void) {
  try {
    toggleLoading(true);
    const siteId = await getSiteId(webflow);
    const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
    const shortName = siteInfo.shortName;
    const url = `https://${shortName}.webflow.io`;
    const audit = await makeRequest('/security-audit', 'POST', { url });
    toggleLoading(false);
    resultsDiv.classList.remove('hidden');
    displayResults(audit.issues, resultsList);
  } catch (error: any) {
    toggleLoading(false);
    showError(error.message);
  }
}

export async function monitorResources(webflow: any, resultsDiv: HTMLElement, resultsList: HTMLElement, toggleLoading: (show: boolean) => void, showError: (message: string) => void) {
  try {
    toggleLoading(true);
    const siteId = await getSiteId(webflow);
    const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
    const shortName = siteInfo.shortName;
    const url = `https://${shortName}.webflow.io`;
    const resources = await makeRequest('/monitor-resources', 'POST', { url });
    toggleLoading(false);
    resultsDiv.classList.remove('hidden');
    displayResults([resources], resultsList);
  } catch (error: any) {
    toggleLoading(false);
    showError(error.message);
  }
}

export async function setupDeepLink(webflow: any, showError: (message: string) => void) {
  const siteId = await getSiteId(webflow);
  const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
  const shortName = siteInfo.shortName;
  const deepLink = `webflow://${shortName}/designer?client_id=YOUR_CLIENT_ID`;
  return deepLink;
}