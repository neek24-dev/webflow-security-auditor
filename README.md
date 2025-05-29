## Webflow Security Auditor
A Webflow Designer Extension to audit custom code, external resources, and manage security headers.

### New Features
- **Header Injection**: Adds CSP, Referrer-Policy, and Permissions-Policy meta tags via SDK or manual copy.
- **Header Detection**: Detects implemented meta tags and server-side headers via a Netlify Function.

### Setup
1. Deploy to Netlify from this repository.
2. Update `index.html` with your Netlify URL for function calls.
3. Register the app in Webflow with the Netlify URL.
4. Upload the ZIP bundle in Webflow App Development.
