// src/scripts/links.js
import { SEVERITY } from './constants.js';
import { displayBrokenLinks } from './ui.js';

export async function isInternalLink(baseUrl, linkUrl) {
  try {
    const baseNetloc = new URL(baseUrl).hostname;
    const linkNetloc = new URL(linkUrl).hostname;
    return baseNetloc === linkNetloc;
  } catch (error) {
    console.error(`Error determining if link is internal: ${linkUrl}`, error);
    return false;
  }
}

export async function getAllLinks(htmlContent, baseUrl) {
  try {
    const $ = window.cheerio.load(htmlContent);
    const links = new Set();
    $('a[href]').each((i, aTag) => {
      let href = $(aTag).attr('href').trim();
      if (!href) {
        return;
      }
      try {
        const absoluteLink = new URL(href, baseUrl).href.split('#')[0];
        links.add(absoluteLink);
      } catch (error) {
        console.warn(`Skipping invalid href in ${baseUrl}: ${href}`, error);
      }
    });
    return Array.from(links);
  } catch (error) {
    console.error(`Error parsing HTML for links in ${baseUrl}:`, error);
    return [];
  }
}

export async function checkLinkStatus(url) {
  try {
    const response = await window.axios.head(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebflowSecurityAuditor/1.0)'
      },
      maxRedirects: 5
    });
    return response.status;
  } catch (error) {
    if (error.response) {
      return error.response.status;
    }
    console.warn(`Error checking link status for ${url}: ${error.message}`);
    return `Error: ${error.message}`;
  }
}

export async function crawlSiteForBrokenLinks(startUrl) {
  const resultsDiv = document.getElementById('resultsContent'); // eslint-disable-line @typescript-eslint/no-unused-vars
  if (resultsDiv) {
    resultsDiv.textContent = 'Here’s your result!';
    const progressDiv = document.getElementById('progress');
    progressDiv.classList.remove('hidden');
    progressDiv.textContent = 'Scanning for broken links...';

    window.urlsToVisit.length = 0;
    window.visitedUrls.clear();
    window.brokenLinksReport.length = 0;

    try {
      new URL(startUrl);
      window.urlsToVisit.push(startUrl);
    } catch (error) {
      console.error('Invalid start URL:', startUrl, error);
      progressDiv.classList.add('hidden');
      throw new Error(`Invalid start URL: ${startUrl}. Please ensure the site URL is correct.`);
    }

    while (window.urlsToVisit.length > 0) {
      const currentUrl = window.urlsToVisit.shift();
      if (window.visitedUrls.has(currentUrl)) {
        continue;
      }

      window.visitedUrls.add(currentUrl);
      progressDiv.textContent = `Checking: ${currentUrl}`;

      try {
        const response = await window.axios.get(currentUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebflowSecurityAuditor/1.0)'
          }
        });
        const statusCode = response.status;

        if (statusCode >= 400) {
          window.brokenLinksReport.push({
            broken_link_url: currentUrl,
            status_code: statusCode,
            source_page_url: currentUrl
          });
          continue;
        }

        if (response.headers['content-type']?.includes('text/html')) {
          const foundLinks = await getAllLinks(response.data, currentUrl);
          for (const link of foundLinks) {
            if (window.visitedUrls.has(link)) {
              continue;
            }

            if (await isInternalLink(startUrl, link)) {
              window.urlsToVisit.push(link);
            } else {
              const extStatus = await checkLinkStatus(link);
              if (typeof extStatus === 'number' && extStatus >= 400) {
                window.brokenLinksReport.push({
                  broken_link_url: link,
                  status_code: extStatus,
                  source_page_url: currentUrl
                });
              } else if (typeof extStatus === 'string' && extStatus.includes('Error')) {
                window.brokenLinksReport.push({
                  broken_link_url: link,
                  status_code: extStatus,
                  source_page_url: currentUrl
                });
              }
            }
          }
        }
      } catch (error) {
        const errorMsg = error.response ? error.response.status : `Error: ${error.message}`;
        window.brokenLinksReport.push({
          broken_link_url: currentUrl,
          status_code: errorMsg,
          source_page_url: currentUrl
        });
      }
    }

    window.lastScanResults.brokenLinks = window.brokenLinksReport.map(entry => ({
      severity: SEVERITY.High,
      title: `Broken Link: ${entry.broken_link_url}`,
      description: `Found a broken link with status ${entry.status_code} on page ${entry.source_page_url}.`,
      location: entry.source_page_url,
      remediation: 'Fix the broken link by updating or removing it.'
    }));

    progressDiv.classList.add('hidden');
    return window.lastScanResults.brokenLinks;
  }
}

export async function checkBrokenLinks() {
  console.log('checkBrokenLinks function called');
  const resultsDiv = document.getElementById('resultsContent');
  const progressDiv = document.getElementById('progress');
  
  progressDiv.classList.remove('hidden');
  progressDiv.textContent = 'Preparing to scan for broken links...';
  resultsDiv.innerHTML = '';

  try {
    if (!window.WebflowApps) {
      throw new Error('Webflow Apps SDK not loaded. Ensure the app is running in the Webflow Designer.');
    }

    const siteInfo = await window.WebflowApps.getSiteInfo();
    if (!siteInfo) {
      throw new Error('Failed to retrieve site information from Webflow SDK.');
    }

    const domain = siteInfo.domain || siteInfo.publishedDomains?.[0];
    if (!domain) {
      throw new Error('No domain or published domains found for this site.');
    }

    const startUrl = `https://${domain}`;
    progressDiv.textContent = `Starting scan with URL: ${startUrl}`;
    console.log(`Starting broken link scan for: ${startUrl}`);
    const brokenLinksIssues = await crawlSiteForBrokenLinks(startUrl); // eslint-disable-line @typescript-eslint/no-unused-vars
    displayBrokenLinks(brokenLinksIssues);

  } catch (error) {
    console.error('Error in checkBrokenLinks:', error);
    progressDiv.classList.add('hidden');
    let errorMessage = 'Error checking broken links.';
    if (error.message.includes('Webflow Apps SDK')) {
      errorMessage = 'Webflow Apps SDK not loaded. Ensure the app is running in the Webflow Designer.';
    } else if (error.message.includes('site information')) {
      errorMessage = 'Failed to retrieve site information. Ensure the site is published and accessible.';
    } else if (error.message.includes('No domain')) {
      errorMessage = 'No domain found for this site. Ensure the site has a published domain.';
    } else if (error.message.includes('Invalid start URL')) {
      errorMessage = error.message;
    } else {
      errorMessage = `Error checking broken links: ${error.message}`;
    }
    resultsDiv.innerHTML = `<p class="text-red-600">${errorMessage}</p>`;
  }
}