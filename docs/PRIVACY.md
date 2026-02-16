# Privacy Policy

**Last Updated**: February 2025

Jobestry is committed to protecting your privacy. This document explains how we handle your data.

## Overview

Jobestry is a browser extension that helps you apply for jobs. **All your data is stored locally in your browser** - we don't collect, store, or transmit your personal information to any external servers (except Google's Gemini API for AI features).

## Data Collection

### What We Store Locally

Jobestry stores the following data **locally in your browser** using Chrome's storage API:

- **Profile Information**: Name, email, phone, location, LinkedIn, GitHub, portfolio, skills, experience
- **Resume Data**: Raw resume text and parsed information (skills, experience, education)
- **API Configuration**: Your Gemini API key (encrypted in browser storage)
- **Job Applications**: URLs, titles, companies, status, notes, dates
- **Preferences**: Writing style preferences, cover letter templates
- **Job Descriptions**: Extracted job descriptions from pages you visit
- **Cached AI Responses**: Cached AI-generated responses to reduce API calls

### What We DON'T Collect

- **Browsing History**: We don't track your browsing history
- **Personal Identifiers**: We don't collect device IDs, IP addresses, or other identifiers
- **Analytics**: We don't use analytics or tracking services
- **Third-Party Data**: We don't share data with third parties (except Google for API calls)

## Data Usage

### How Your Data is Used

1. **Form Auto-Fill**: Your profile and resume data is used to fill job application forms
2. **AI Generation**: Your data is sent to Google's Gemini API to generate personalized responses
3. **Application Tracking**: Your job applications are tracked locally for your reference
4. **Caching**: AI responses are cached locally to reduce API calls

### API Data Transmission

When you use AI features, the following data is sent to **Google's Gemini API**:

- Your resume text (parsed)
- Job description text
- Form field questions
- Your profile information (name, experience, skills)
- Writing style preferences

**Important**: 
- Your API key is stored locally and used to authenticate requests
- Data is sent directly from your browser to Google's servers
- We don't intercept or store this data
- Google's privacy policy applies to data sent to their API

## Data Storage

### Local Storage

All data is stored using Chrome's `chrome.storage.local` API:

- **Location**: Your browser's local storage
- **Persistence**: Data persists until you uninstall the extension or clear browser data
- **Access**: Only the extension can access this data
- **Backup**: Data is not automatically backed up (you can export applications to CSV)

### Storage Security

- Data is stored locally in your browser
- Not accessible by websites
- Not synced to cloud (unless you enable Chrome sync)
- Encrypted by Chrome's storage system

## Data Sharing

### Third-Party Services

**Google Gemini API**:
- We send data to Google's Gemini API for AI features
- Google's [Privacy Policy](https://policies.google.com/privacy) applies
- Google may retain API request data for up to 30 days for abuse prevention
- You can review Google's data practices in their privacy policy

**No Other Third Parties**:
- We don't share data with any other third parties
- We don't sell your data
- We don't use analytics services
- We don't use advertising services

## Your Rights

### Access Your Data

You can access all your data through the extension:
- **Profile**: View/edit in the popup
- **Resume**: View/edit in the popup
- **Applications**: View/export in the Track view
- **Settings**: View/edit in the Options page

### Delete Your Data

You can delete your data at any time:

1. **Individual Items**: Delete individual applications or clear specific data
2. **All Data**: Uninstall the extension to remove all stored data
3. **Browser Storage**: Clear browser data for the extension

### Export Your Data

- **Applications**: Export to CSV from the Track view
- **Resume**: Copy/paste from the Resume tab
- **Profile**: Copy individual fields

## API Key Security

### Your API Key

- Stored locally in your browser
- Never shared with us or third parties
- Used only to authenticate API requests
- Masked in UI displays (shows only first 4 and last 4 characters)

### API Key Best Practices

- Don't share your API key publicly
- Don't commit API keys to version control
- Rotate your key if compromised
- Monitor usage in Google Cloud Console

## Children's Privacy

Jobestry is not intended for children under 13. We don't knowingly collect data from children.

## Changes to Privacy Policy

We may update this privacy policy from time to time. Changes will be:
- Posted in this document
- Noted in release notes
- Effective immediately upon posting

## Security

### Security Measures

- **Local Storage**: All data stored locally, not on external servers
- **Direct API Calls**: API calls made directly from your browser
- **No Proxies**: No intermediate servers intercepting data
- **HTTPS**: All API calls use HTTPS encryption
- **Input Sanitization**: Inputs are sanitized to prevent injection attacks

### Security Best Practices

- Keep your browser updated
- Use strong passwords for your Google account
- Don't share your API key
- Review API usage regularly
- Report security issues privately

## Data Retention

### Local Data

- **Stored Until**: You uninstall the extension or clear browser data
- **No Automatic Deletion**: Data persists until manually deleted
- **Export Before Uninstall**: Export important data before uninstalling

### API Data (Google)

- Google may retain API request data for up to 30 days
- Subject to Google's privacy policy
- You can review/delete data in Google Cloud Console

## International Users

### Data Location

- **Local Storage**: Stored in your browser (local to your device)
- **API Calls**: Data sent to Google's servers (location varies by region)
- **No Cross-Border Transfer**: We don't transfer data across borders

### GDPR Compliance

If you're in the EU:
- You have the right to access your data
- You have the right to delete your data
- You have the right to data portability
- All data is stored locally (no cross-border transfer)

## Contact

For privacy questions or concerns:

- **GitHub Issues**: Open an issue on GitHub
- **Security Issues**: Report privately (don't open public issues)

## Transparency

### Open Source

Jobestry is open source - you can:
- Review all code
- Verify our privacy claims
- See exactly how data is handled
- Contribute improvements

### Code Review

Key files to review:
- `chrome-extension/src/background/` - API calls
- `packages/storage/` - Storage implementation
- `pages/content/` - Data extraction
- `pages/content-ui/` - Data display

## Summary

**What We Do**:
- Store data locally in your browser
- Send data to Google's Gemini API for AI features
- Never share data with third parties (except Google)
- Never sell your data
- Never track your browsing

**What You Control**:
- What data you provide
- When to use AI features
- When to delete data
- Which API key to use
- Whether to use the extension

**Your Privacy**:
- All data stored locally
- No external data collection
- Direct API calls only
- Full transparency (open source)

---

**Questions?** Open an issue on GitHub or review the code yourself - it's all open source!
