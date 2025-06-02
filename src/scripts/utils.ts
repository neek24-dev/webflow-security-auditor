// src/scripts/utils.ts
export async function getSiteId(webflow: any) {
  const site = await webflow.getSite();
  return site.id;
}

export async function makeRequest(endpoint: string, method: string = 'GET', body: any = null) {
  const token = localStorage.getItem('idToken');
  if (!token) {
    throw new Error('No ID token found. Please authenticate at http://localhost:3000/auth');
  }

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`http://localhost:3000${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export function displayResults(results: any[], listElement: HTMLElement) {
  listElement.innerHTML = '';
  if (results.length === 0) {
    const li = document.createElement('li');
    li.className = 'text-gray-600 italic';
    li.textContent = 'No issues found.';
    listElement.appendChild(li);
    return;
  }

  results.forEach(item => {
    const li = document.createElement('li');
    li.className = 'p-2 bg-white rounded-md shadow-sm';
    if (typeof item === 'string') {
      li.textContent = item;
    } else if (item.url) {
      li.innerHTML = `<span class="font-medium">URL:</span> ${item.url} ${
        item.status ? `<span class="text-red-600">(Status: ${item.status})</span>` : ''
      } ${item.text ? `<span class="text-gray-600">(${item.text})</span>` : ''}`;
    } else if (item.type) {
      li.innerHTML = `<span class="font-medium">Issue:</span> ${item.type} - ${item.details.join(', ')}`;
    } else if (item.resources) {
      li.innerHTML = `<span class="font-medium">Resources:</span> ${item.resources.length} found, ${
        item.suspicious.length
      } suspicious (${item.suspicious.map((r: any) => `${r.type}: ${r.url}`).join(', ')})`;
    }
    listElement.appendChild(li);
  });
}