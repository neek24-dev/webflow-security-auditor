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
## Updates
- **Improved Visibility**: Removed scrollbars and dynamically resized iframe to fit content.
- ## Vim Troubleshooting
- **Swap File Error**: Kill the running Vim process (e.g., `kill -9 44629`), delete the swap file (`rm .git/.COMMIT_EDITMSG.swp`), and resume the commit.
- ## Updates
- **Real-Time Monitoring**: Added background vulnerability monitoring with notifications for new issues.
- ## Updates
- **Error Handling**: Added a styled yellow box with manual instructions when header injection fails, matching the non-injectable headers UI.
