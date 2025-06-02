// src/scripts/security.ts
import { getSiteId, makeRequest, displayResults } from './utils';

export async function checkBrokenLinks(webflow: any, resultsDiv: HTMLElement, resultsList: HTMLElement, toggleLoading: (show: boolean) => void, showError: (message: string) => void) {
  try {
    console.log('Starting checkBrokenLinks...');
    toggleLoading(true);
    console.log('Fetching site ID...');
    const siteId = await getSiteId(webflow);
    console.log('Site ID fetched:', siteId);
    console.log('Fetching links from API...');
    const links = await makeRequest(`/links?siteId=${siteId}`);
    console.log('Links fetched:', links);
    const brokenLinks: any[] = [];
    console.log('Checking links...');
    for (const link of links) {
      console.log(`Checking link: ${link.url}`);
      const result = await makeRequest('/check-link', 'POST', { url: link.url });
      console.log(`Link check result for ${link.url}:`, result);
      if (result.status >= 400) {
        brokenLinks.push({ ...link, status: result.status });
      }
    }
    console.log('Broken links found:', brokenLinks);
    toggleLoading(false);
    resultsDiv.classList.remove('hidden');
    displayResults(brokenLinks, resultsList);
  } catch (error: any) {
    console.error('Error in checkBrokenLinks:', error);
    toggleLoading(false);
    showError(error.message);
    throw error;
  }
}

export async function runSecurityAudit(webflow: any, customUrl: string, resultsDiv: HTMLElement, resultsList: HTMLElement, toggleLoading: (show: boolean) => void, showError: (message: string) => void) {
  try {
    toggleLoading(true);
    const siteId = await getSiteId(webflow);
    const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
    const shortName = siteInfo.shortName;
    const url = customUrl || `https://${shortName}.webflow.io`;
    const audit = await makeRequest('/security-audit', 'POST', { url });
    toggleLoading(false);
    resultsDiv.classList.remove('hidden');
    displayResults(audit.issues, resultsList);
  } catch (error: any) {
    toggleLoading(false);
    showError(error.message);
    throw error;
  }
}

export async function monitorResources(webflow: any, customUrl: string, resultsDiv: HTMLElement, resultsList: HTMLElement, toggleLoading: (show: boolean) => void, showError: (message: string) => void) {
  try {
    toggleLoading(true);
    const siteId = await getSiteId(webflow);
    const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
    const shortName = siteInfo.shortName;
    const url = customUrl || `https://${shortName}.webflow.io`;
    const resources = await makeRequest('/monitor-resources', 'POST', { url });
    toggleLoading(false);
    resultsDiv.classList.remove('hidden');
    displayResults([resources], resultsList);
  } catch (error: any) {
    toggleLoading(false);
    showError(error.message);
    throw error;
  }
}

export async function setupDeepLink(webflow: any, showError: (message: string) => void) {
  const siteId = await getSiteId(webflow);
  const siteInfo = await makeRequest(`/site-info?siteId=${siteId}`);
  const shortName = siteInfo.shortName;
  const deepLink = `webflow://${shortName}/designer?client_id=YOUR_CLIENT_ID`;
  return deepLink;
}