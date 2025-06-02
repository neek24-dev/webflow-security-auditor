// server.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const hasEnv = process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.JWT_SECRET;

// /auth endpoint
app.get('/auth', async (req, res) => {
  if (hasEnv) {
    const { code } = req.query;
    if (!code) {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.CLIENT_ID,
        redirect_uri: 'http://localhost:3000/auth',
        scope: 'cms:read sites:read',
        state: 'someRandomState'
      });
      const authUrl = `https://webflow.com/oauth/authorize?${params.toString()}`;
      res.redirect(authUrl);
    } else {
      try {
        const tokenRes = await axios.post('https://api.webflow.com/oauth/token', {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000/auth'
        });
        const accessToken = tokenRes.data.access_token;
        const idToken = jwt.sign({ accessToken }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ idToken });
      } catch (error) {
        res.status(500).json({ error: 'Failed to exchange code for access token' });
      }
    }
  } else {
    res.json({ idToken: 'dummy-token' });
  }
});

// /site-info endpoint
app.get('/site-info', async (req, res) => {
  if (hasEnv) {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const { accessToken } = jwt.verify(token, process.env.JWT_SECRET);
      const siteId = req.query.siteId;
      const siteInfoRes = await axios.get(`https://api.webflow.com/sites/${siteId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'accept-version': '1.0.0'
        }
      });
      res.json({ shortName: siteInfoRes.data.shortName });
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.json({ shortName: 'example-site' });
  }
});

// /links endpoint
app.get('/links', async (req, res) => {
  if (hasEnv) {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const { accessToken } = jwt.verify(token, process.env.JWT_SECRET);
      const siteId = req.query.siteId;
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
        if (pageContentRes.data.links) {
          links.push(...pageContentRes.data.links.map(link => ({ url: link.url, text: link.text || 'No text' })));
        }
      }
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.json([
      { url: 'https://example.com', text: 'Example Link' },
      { url: 'https://broken-link.com', text: 'Broken Link' }
    ]);
  }
});

// /check-link endpoint
app.post('/check-link', async (req, res) => {
  if (hasEnv) {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      const { url } = req.body;
      const response = await axios.get(url, { validateStatus: false });
      res.json({ status: response.status });
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    const { url } = req.body;
    if (url.includes('broken')) {
      res.json({ status: 404 });
    } else {
      res.json({ status: 200 });
    }
  }
});

// /security-audit endpoint
app.post('/security-audit', async (req, res) => {
  if (hasEnv) {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      const { url } = req.body;
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
      res.json({ issues });
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.json({
      issues: [
        { type: 'Missing CSP Header', details: ['Content-Security-Policy not set'] }
      ]
    });
  }
});

// /monitor-resources endpoint
app.post('/monitor-resources', async (req, res) => {
  if (hasEnv) {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      const { url } = req.body;
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
      res.json({ resources: externalResources, suspicious });
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    res.json({
      resources: [
        { type: 'script', url: 'https://cdn.example.com/script.js' },
        { type: 'iframe', url: 'https://malicious.com/iframe' }
      ],
      suspicious: [
        { type: 'iframe', url: 'https://malicious.com/iframe' }
      ]
    });
  }
});

app.listen(3000, () => {
  console.log('Data Client running on http://localhost:3000');
});
