# Jobestry

<div align="center">

![Jobestry Logo](https://img.shields.io/badge/Jobestry-Job%20Application%20Assistant-blue?style=for-the-badge)

**AI-powered Chrome extension that helps you apply for jobs faster and smarter**

[Features](#features) • [Installation](#installation) • [Setup](#setup) • [Usage](#usage) • [Contributing](./CONTRIBUTING.md) • [Credits](./CREDITS.md)

</div>

## Overview

Jobestry is a Chrome extension that automates and enhances your job application process. It uses AI to generate personalized responses for application forms, creates tailored cover letters, tracks your applications, and provides insights about job fit.

### Key Features

- 🤖 **AI-Powered Auto-Fill**: Automatically detects form fields and generates personalized responses using your resume and profile
- 📝 **Smart Cover Letters**: Generate tailored cover letters based on job descriptions
- 🎯 **Job Insights**: Get fit scores, keyword analysis, and interview question predictions
- 📊 **Application Tracking**: Track all your job applications in one place
- 🎨 **Multiple Writing Styles**: Choose from professional, confident, friendly, or concise tones
- 🔒 **Privacy-First**: All data stored locally, AI calls made directly from your browser

## Features

### Auto-Fill Forms
- Automatically detects form fields on job application pages
- Generates context-aware responses using your resume and profile
- Supports standard fields (name, email, phone) and custom questions
- Batch fill multiple fields at once

### Cover Letter Generator
- Generates personalized cover letters tailored to job descriptions
- Multiple improvement modes (shorten, expand, professional, etc.)
- Custom templates support
- Word count tracking

### Job Insights
- Fit score calculation based on your resume
- Keyword extraction and matching
- Strengths and gaps analysis
- Predicted interview questions

### Application Tracking
- Automatically detects and saves job postings
- Track application status (saved, applied, interview, offer, rejected)
- Add notes and export to CSV
- View application history

### Smart Features
- Field highlighting for easy navigation
- Chat interface for job-related questions
- Resume parsing (PDF and text files)
- Multiple style presets for different tones

## Installation

### Prerequisites

- Node.js >= 22.15.1 (recommend using [nvm](https://github.com/nvm-sh/nvm))
- pnpm >= 10.11.0 (`npm install -g pnpm`)
- Chrome or Firefox browser

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd jobestry
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the extension**
   ```bash
   # Development build
   pnpm dev
   
   # Production build
   pnpm build
   ```

4. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

5. **Load in Firefox** (temporary)
   - Run `pnpm dev:firefox` or `pnpm build:firefox`
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select `dist/manifest.json`

## Setup

### 1. Configure Your Profile

1. Click the Jobestry extension icon in your toolbar
2. Fill in your profile information:
   - Name, email, phone
   - Location, LinkedIn, GitHub, portfolio
   - Skills and experience

### 2. Upload Your Resume

1. Go to the "Resume" tab in the popup
2. Upload a PDF or text file, or paste your resume text
3. The extension will parse your resume automatically

### 3. Add Gemini API Key

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Go to the "API Key" tab in the popup
3. Paste your API key and save

> **Note**: The API key is stored locally in your browser and never shared. All API calls are made directly from your browser to Google's servers.

For detailed API setup instructions, see [API Setup Guide](./docs/API_SETUP.md).

## Usage

### On Job Application Pages

1. **Navigate to a job application page**
   - The extension automatically detects form fields
   - A Jobestry button appears in the bottom-right corner

2. **Open the Jobestry panel**
   - Click the Jobestry button to open the sidebar
   - You'll see detected fields and job information

3. **Use Auto-Fill**
   - Go to the "Autofill" tab
   - Click "Fill All" to fill all fields at once
   - Or click individual fields to fill them one by one

4. **Generate Cover Letter**
   - Go to the "Cover Letter" tab
   - Click "Generate Cover Letter"
   - Review and edit as needed
   - Copy to clipboard or download as PDF

5. **View Insights**
   - Go to the "Insight" tab
   - See fit score, keywords, strengths, and gaps
   - Review predicted interview questions

6. **Track Application**
   - Go to the "Track" tab
   - Click "Save Job" to add to your tracking list
   - Update status as you progress

### Writing Styles

Choose from multiple writing style presets:
- **Professional**: Formal and business-appropriate
- **Confident**: Bold and achievement-focused
- **Friendly**: Warm and approachable
- **Concise**: Direct and to-the-point

You can also create custom presets in the Options page.

### Keyboard Shortcuts

Jobestry supports keyboard shortcuts to speed up your workflow:

#### Extension Shortcuts (Work on any page)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` / `Cmd+Shift+K` | Toggle Jobestry sidebar |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Quick fill all fields |
| `Ctrl+Shift+L` / `Cmd+Shift+L` | Generate cover letter |
| `Ctrl+Shift+S` / `Cmd+Shift+S` | Save job to tracker |

> **Note**: You can customize these shortcuts in Chrome at `chrome://extensions/shortcuts`

#### In-App Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Close sidebar, close popup menus |
| `Enter` | Submit forms, add tags |
| `Backspace` | Remove last tag (when input is empty) |

#### Customizing Shortcuts

1. Open Chrome and navigate to `chrome://extensions/shortcuts`
2. Find Jobestry in the list
3. Click on a shortcut field and press your desired key combination
4. Changes are saved automatically

## Project Structure

```
jobestry/
├── chrome-extension/     # Extension manifest and public assets
│   ├── manifest.ts      # Extension manifest configuration
│   └── src/
│       └── background/   # Background service worker
├── pages/               # Extension pages
│   ├── content/         # Content script for form detection
│   ├── content-ui/      # React UI injected into pages
│   ├── popup/           # Extension popup
│   └── options/         # Options/settings page
├── packages/            # Shared packages
│   ├── storage/         # Storage utilities
│   ├── shared/          # Shared types and utilities
│   ├── ui/              # UI components
│   └── ...
└── docs/               # Documentation
```

For detailed architecture information, see [Architecture Documentation](./docs/ARCHITECTURE.md).

## Development

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking
- `pnpm e2e` - Run end-to-end tests

### Adding Dependencies

```bash
# Add to root
pnpm add <package> -w

# Add to specific package
pnpm add <package> -F <package-name>
```

### Code Style

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Tailwind CSS for styling
- React 19 with hooks

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guidelines.

## Troubleshooting

### Extension Not Loading

- Make sure you're loading from the `dist` directory
- Check that Developer mode is enabled
- Try rebuilding: `pnpm clean && pnpm build`

### API Key Issues

- Verify your API key is correct
- Check API quota limits in Google Cloud Console
- Ensure you're using a valid Gemini API key

### Form Fields Not Detected

- Refresh the page
- Click the "Scan page" button in the Jobestry panel
- Some sites may require manual field selection

### Hot Module Reload Issues

- Restart the dev server: `Ctrl+C` then `pnpm dev`
- If issues persist, kill turbo processes and restart

For more troubleshooting tips, see the [Architecture Documentation](./docs/ARCHITECTURE.md).

## Privacy & Security

Jobestry is designed with privacy in mind:

- **Local Storage**: All your data (profile, resume, applications) is stored locally in your browser
- **Direct API Calls**: API calls are made directly from your browser to Google's servers
- **No Data Collection**: We don't collect, store, or transmit your personal data
- **Open Source**: You can review all the code to verify our privacy claims

For detailed privacy information, see [Privacy Documentation](./docs/PRIVACY.md).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Credits

Jobestry is built on top of the excellent [Chrome Extension Boilerplate React Vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) by Jonghakseo.

For a complete list of credits and acknowledgments, see [CREDITS.md](./CREDITS.md).

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/jobestry/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/jobestry/discussions)

## Acknowledgments

- Built with [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/)
- Uses [Google Gemini API](https://ai.google.dev/) for AI capabilities
- Powered by [Turborepo](https://turbo.build/repo) for monorepo management

---

Made with ❤️ for job seekers everywhere
