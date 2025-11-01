# Privacy Policy for AI Text Summarizer

**Last Updated: November 1, 2024**

## Overview

AI Text Summarizer is a Chrome extension that provides text summarization capabilities for web pages and PDF documents using Chrome's built-in Summarizer API. This privacy policy explains how the extension handles user data.

## Data Collection and Usage

### What Data We Access

The extension accesses the following data only when you explicitly request a summary:

- **Web Page Content**: Text content from the currently active web page when you click "Extract Text"
- **PDF Content**: Text extracted from PDF files when you click "Extract Text" on a PDF page
- **Tab Information**: Basic tab information (URL, title) to determine content type

### How We Process Your Data

- **Local Processing Only**: All text extraction and summarization is performed entirely locally in your browser using Chrome's built-in AI Summarizer API
- **No External Transmission**: Your content is NEVER sent to external servers, third-party services, or our servers
- **No Storage**: The extension does not store, save, or retain any of your page content or summaries after you close the extension popup
- **No Analytics**: We do not collect analytics, usage statistics, or any tracking data

### Permissions Explanation

The extension requests the following permissions:

- **activeTab**: To access the content of the current tab only when you initiate a summary action
- **scripting**: To inject scripts that extract text from web pages and PDFs
- **tabs**: To identify the active tab and determine if it contains a PDF
- **host_permissions (all_urls)**: To enable summarization on any website you visit, but only when you explicitly request it

## Third-Party Services

The extension uses the following third-party library:

- **PDF.js** (Mozilla): Used locally in your browser to parse PDF files and extract text. No data is sent to Mozilla or any external service.

## Data Sharing

We do not share, sell, rent, or trade any user data with third parties because we do not collect any user data.

## Chrome's Built-in AI

This extension uses Chrome's experimental built-in Summarizer API. The data processing behavior of Chrome's built-in AI is governed by Google's privacy policies. According to Google's documentation, the built-in AI models run locally on your device.

## Updates to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date at the top of this policy.

## Contact

If you have questions or concerns about this privacy policy, please contact us by opening an issue on our GitHub repository.

## Your Rights

Since we do not collect or store any personal data, there is no personal data to request, modify, or delete. All processing happens locally on your device and is temporary.

## Children's Privacy

This extension does not knowingly collect any information from children under 13 years of age.

## Compliance

This extension is designed to be compliant with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Chrome Web Store Developer Program Policies
