// server.js
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify();

// OAuth Authentication Route
fastify.get('/auth', async (request, reply) => {
  const { code } = request.query;
  if (!code) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.CLIENT_ID,
      redirect_uri: 'http://localhost:3000/auth',
      scope: 'cms:read sites:read', // adjust scopes as needed
      state: 'someRandomState'
    });
    const authUrl = `https://webflow.com/oauth/authorize?${params.toString()}`;
    reply.redirect(authUrl);
  } else {
    try {
      // Exchange code for access token using axios
      const tokenRes = await axios.post('https://api.webflow.com/oauth/token', {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/auth'
      });
      const accessToken = tokenRes.data.access_token;
      const idToken = jwt.sign({ accessToken }, process.env.JWT_SECRET, { expiresIn: '1h' });
      reply.send({ idToken });
    } catch (error) {
      console.error('OAuth Error:', error.response?.data || error.message);
      reply.status(500).send({ error: 'Failed to exchange code for access token' });
    }
  }
});

// Get Site Information (for Deep Linking)
fastify.get('/site-info', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  try {
    const { accessToken } = jwt.verify(token, process.env.JWT_SECRET);
    const siteId = request.query.siteId;
    const siteInfoRes = await axios.get(`https://api.webflow.com/sites/${siteId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'accept-version': '1.0.0'
      }
    });
    reply.send({ shortName: siteInfoRes.data.shortName });
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Get All Pages and Extract Links
fastify.get('/links', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  try {
    const { accessToken } = jwt.verify(token, process.env.JWT_SECRET);
    const siteId = request.query.siteId;
    const pagesRes = await axios.get(`https://api.webflow.com/sites/${siteId}/pages`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'accept-version': '1.0.0'
      }
    });
    const pages = pagesRes.data;
    const links = [];
    for (const page of pages) {
      const pageContentRes = await axios.get(`https://api.webflow.com/pages/${page._id}/content`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'accept-version': '1.0.0'
        }
      });
      const pageLinks = extractLinksFromContent(pageContentRes.data);
      links.push(...pageLinks);
    }
    reply.send(links);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Check a Single Link
fastify.post('/check-link', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const { url } = request.body;
    const response = await axios.get(url, { validateStatus: false });
    reply.send({ status: response.status });
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Security Audit (Mixed Content, Headers)
fastify.post('/security-audit', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const { url } = request.body;
    const response = await axios.get(url, { validateStatus: false });
    const $ = cheerio.load(response.data);
    const issues = [];

    // Check for Mixed Content
    const resources = ['img[src]', 'script[src]', 'link[href]'].flatMap(selector =>
      $(selector).map((i, el) => $(el).attr(selector.includes('src') ? 'src' : 'href')).get()
    );
    const mixedContent = resources.filter(res => res.startsWith('http://') && url.startsWith('https://'));
    if (mixedContent.length > 0) {
      issues.push({ type: 'mixed-content', details: mixedContent });
    }

    // Check Security Headers
    const headers = response.headers;
    const missingHeaders = [];
    if (!headers['content-security-policy']) missingHeaders.push('Content-Security-Policy');
    if (!headers['strict-transport-security']) missingHeaders.push('Strict-Transport-Security');
    if (missingHeaders.length > 0) {
      issues.push({ type: 'missing-headers', details: missingHeaders });
    }

    reply.send({ issues });
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Monitor External Resources
fastify.post('/monitor-resources', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const { url } = request.body;
    const response = await axios.get(url, { validateStatus: false });
    const $ = cheerio.load(response.data);
    const externalResources = [];

    // Extract Scripts and Styles
    const scripts = $('script[src]').map((i, el) => $(el).attr('src')).get();
    const styles = $('link[rel="stylesheet"][href]').map((i, el) => $(el).attr('href')).get();
    externalResources.push(
      ...scripts.map(src => ({ type: 'script', url: src })),
      ...styles.map(href => ({ type: 'style', url: href }))
    );

    // Flag Suspicious Resources
    const suspicious = externalResources.filter(res => !res.url.includes(url.split('/')[2]));
    reply.send({ resources: externalResources, suspicious });
  } catch (error) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Helper to Extract Links
function extractLinksFromContent(content) {
  const links = [];
  if (content.links) {
    links.push(...content.links.map(link => ({ url: link.url, text: link.text || 'No text' })));
  }
  return links;
}

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  console.log('Data Client running on http://localhost:3000');
});