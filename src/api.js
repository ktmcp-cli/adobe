import axios from 'axios';
import { getConfig } from './config.js';

const DEFAULT_BASE_URL = 'http://localhost:4502';

function getClient() {
  const username = getConfig('username');
  const password = getConfig('password');
  const baseURL = getConfig('baseUrl') || DEFAULT_BASE_URL;

  if (!username || !password) {
    throw new Error('AEM credentials not configured. Run: adobe config set --username admin --password admin');
  }

  return axios.create({
    baseURL,
    auth: { username, password },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
}

function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    if (status === 401) throw new Error('Authentication failed. Check your AEM credentials.');
    if (status === 403) throw new Error('Access forbidden. Check your AEM user permissions.');
    if (status === 404) throw new Error('Resource not found in AEM.');
    if (status === 500) throw new Error('AEM server error. Check your AEM instance.');
    const message = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`API Error (${status}): ${message}`);
  } else if (error.request) {
    const baseURL = getConfig('baseUrl') || DEFAULT_BASE_URL;
    throw new Error(`No response from AEM at ${baseURL}. Is your AEM instance running?`);
  } else {
    throw error;
  }
}

// ============================================================
// ASSETS (DAM)
// ============================================================

export async function listAssets(path = '/content/dam', { limit = 20 } = {}) {
  try {
    const client = getClient();
    const response = await client.get(`${path}.infinity.json`);
    const data = response.data;
    const assets = [];
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('jcr:') || key === 'rep:policy') continue;
      if (typeof value === 'object' && value['jcr:primaryType']) {
        assets.push({
          name: key,
          path: `${path}/${key}`,
          type: value['jcr:primaryType'],
          title: value['jcr:content']?.['jcr:title'] || key,
          mimeType: value['jcr:content']?.['jcr:mimeType'] || 'N/A',
          lastModified: value['jcr:content']?.['jcr:lastModified'] || 'N/A'
        });
        if (assets.length >= limit) break;
      }
    }
    return assets;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getAsset(assetPath) {
  try {
    const client = getClient();
    const response = await client.get(`${assetPath}.infinity.json`);
    return { path: assetPath, ...response.data };
  } catch (error) {
    handleApiError(error);
  }
}

export async function uploadAsset(damPath, fileName, fileContent, mimeType = 'application/octet-stream') {
  try {
    const client = getClient();
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', Buffer.from(fileContent), { filename: fileName, contentType: mimeType });
    form.append('fileName', fileName);

    const response = await client.post(`${damPath}.createasset.html`, form, {
      headers: { ...form.getHeaders(), 'Accept': 'application/json' }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// ============================================================
// PAGES
// ============================================================

export async function listPages(path = '/content', { limit = 20 } = {}) {
  try {
    const client = getClient();
    const response = await client.get(`${path}.1.json`);
    const data = response.data;
    const pages = [];
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('jcr:') || key === 'rep:policy') continue;
      if (typeof value === 'object') {
        pages.push({
          name: key,
          path: `${path}/${key}`,
          title: value['jcr:content']?.['jcr:title'] || key,
          template: value['jcr:content']?.['cq:template'] || 'N/A',
          lastModified: value['jcr:content']?.['cq:lastModified'] || 'N/A'
        });
        if (pages.length >= limit) break;
      }
    }
    return pages;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getPage(pagePath) {
  try {
    const client = getClient();
    const response = await client.get(`${pagePath}.infinity.json`);
    return { path: pagePath, ...response.data };
  } catch (error) {
    handleApiError(error);
  }
}

export async function createPage(parentPath, pageName, title, template) {
  try {
    const client = getClient();
    const params = new URLSearchParams({
      '_charset_': 'utf-8',
      ':name': pageName,
      'jcr:primaryType': 'cq:Page',
      'jcr:content/jcr:primaryType': 'cq:PageContent',
      'jcr:content/jcr:title': title,
      'jcr:content/cq:template': template || '/libs/wcm/foundation/templates/page'
    });

    const response = await client.post(`${parentPath}`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { path: `${parentPath}/${pageName}`, title, template };
  } catch (error) {
    handleApiError(error);
  }
}

// ============================================================
// TAGS
// ============================================================

export async function listTags(namespace = '/content/cq:tags') {
  try {
    const client = getClient();
    const response = await client.get(`${namespace}.1.json`);
    const data = response.data;
    const tags = [];
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('jcr:') || key === 'rep:policy') continue;
      if (typeof value === 'object') {
        tags.push({
          name: key,
          path: `${namespace}/${key}`,
          title: value['jcr:title'] || key,
          description: value['jcr:description'] || 'N/A',
          count: value['cq:count'] || 0
        });
      }
    }
    return tags;
  } catch (error) {
    handleApiError(error);
  }
}

export async function createTag(namespace, tagName, title, description) {
  try {
    const client = getClient();
    const params = new URLSearchParams({
      '_charset_': 'utf-8',
      'jcr:primaryType': 'cq:Tag',
      'jcr:title': title,
      ...(description && { 'jcr:description': description })
    });

    await client.post(`${namespace}/${tagName}`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { path: `${namespace}/${tagName}`, name: tagName, title, description };
  } catch (error) {
    handleApiError(error);
  }
}

export async function deleteTag(tagPath) {
  try {
    const client = getClient();
    await client.delete(tagPath, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  } catch (error) {
    handleApiError(error);
  }
}
