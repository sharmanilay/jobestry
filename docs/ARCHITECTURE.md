# Architecture Documentation

This document describes the architecture, data flow, and key components of Jobestry.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Storage Architecture](#storage-architecture)
- [Message Passing](#message-passing)
- [Key Components](#key-components)

## Overview

Jobestry is a Chrome extension built with React, TypeScript, and Vite. It uses a monorepo structure managed by Turborepo. The extension consists of multiple components that work together:

- **Background Service Worker**: Handles API calls and business logic
- **Content Scripts**: Detect form fields and extract job descriptions
- **Content UI**: React-based sidebar interface injected into pages
- **Popup**: Extension popup for configuration
- **Options Page**: Settings and preferences

## Project Structure

```
jobestry/
├── chrome-extension/          # Extension configuration
│   ├── manifest.ts            # Manifest v3 configuration
│   ├── public/                # Static assets (icons, CSS)
│   └── src/
│       └── background/        # Background service worker
│           ├── index.ts       # Message handler
│           ├── gemini-service.ts      # AI response generation
│           ├── smart-fill-service.ts  # Smart fill logic
│           ├── batch-processor.ts     # Batch operations
│           └── prompts.ts             # AI prompts
│
├── pages/                     # Extension pages
│   ├── content/              # Content script (form detection)
│   │   ├── form-detector.ts  # Field detection logic
│   │   └── matches/all/      # Content script entry point
│   │
│   ├── content-ui/           # React UI injected into pages
│   │   └── matches/all/
│   │       ├── App.tsx       # Main UI component
│   │       ├── FieldPopup.tsx
│   │       ├── job-utils.ts
│   │       └── pdf-generator.ts
│   │
│   ├── popup/                # Extension popup
│   │   └── src/Popup.tsx
│   │
│   └── options/              # Options/settings page
│       └── src/Options.tsx
│
├── packages/                  # Shared packages
│   ├── storage/              # Storage utilities
│   │   └── lib/impl/         # Storage implementations
│   │       ├── user-profile-storage.ts
│   │       ├── resume-storage.ts
│   │       ├── api-config-storage.ts
│   │       ├── applications-storage.ts
│   │       └── ...
│   │
│   ├── shared/               # Shared types and utilities
│   │   ├── const.ts          # Constants
│   │   └── lib/              # Utilities and hooks
│   │
│   ├── ui/                   # UI components
│   │   └── lib/components/   # Reusable components
│   │
│   ├── i18n/                 # Internationalization
│   ├── vite-config/          # Vite configuration
│   └── ...
│
└── docs/                     # Documentation
```

## Component Architecture

### Background Service Worker

**Location**: `chrome-extension/src/background/`

The background service worker is the core of the extension. It:

- Handles all API communication with Google Gemini
- Manages message passing between components
- Processes AI requests (responses, cover letters, insights)
- Coordinates batch operations

**Key Files**:
- `index.ts`: Main message handler, routes messages to appropriate services
- `gemini-service.ts`: Core AI service for generating responses
- `smart-fill-service.ts`: Smart fill logic for form fields
- `batch-processor.ts`: Batch generation for multiple fields
- `prompts.ts`: AI prompt templates and system prompts

### Content Scripts

**Location**: `pages/content/src/`

Content scripts run in the context of web pages and:

- Detect form fields on job application pages
- Extract job descriptions from pages
- Fill form fields with generated responses
- Highlight detected fields

**Key Files**:
- `form-detector.ts`: Field detection algorithm using heuristics and selectors
- `matches/all/index.ts`: Content script entry point, handles page interaction

### Content UI

**Location**: `pages/content-ui/src/matches/all/`

React-based UI injected into pages via Shadow DOM:

- Sidebar interface for interacting with Jobestry
- Views: Highlight, Autofill, Insight, Cover Letter, Chat, Track
- Manages state and communicates with content scripts and background

**Key Files**:
- `App.tsx`: Main UI component (2400+ lines)
- `FieldPopup.tsx`: Popup for individual field generation
- `job-utils.ts`: Utility functions for job data
- `pdf-generator.ts`: PDF generation for cover letters

### Popup

**Location**: `pages/popup/src/`

Extension popup for quick access:

- Profile management
- Resume upload
- API key configuration
- Status overview

### Options Page

**Location**: `pages/options/src/`

Full settings page:

- User preferences
- Writing style presets
- Cover letter templates
- Advanced settings

## Data Flow

### Field Detection Flow

```
1. Page Load
   ↓
2. Content Script (content/all/index.ts)
   ↓
3. Form Detector (form-detector.ts)
   ↓
4. Detect Fields + Extract Job Description
   ↓
5. Post Message to Content UI
   ↓
6. Content UI Updates State
   ↓
7. Display Fields in Sidebar
```

### AI Generation Flow

```
1. User Clicks "Generate" in Content UI
   ↓
2. Content UI sends message to Background
   ↓
3. Background Service Worker (index.ts)
   ↓
4. Route to Gemini Service (gemini-service.ts)
   ↓
5. Build Prompts (prompts.ts)
   ↓
6. Call Gemini API
   ↓
7. Cache Response (if applicable)
   ↓
8. Return Response to Content UI
   ↓
9. Content UI fills field via Content Script
   ↓
10. Content Script updates form field
```

### Storage Flow

```
User Input (Popup/Options)
   ↓
Storage Package (packages/storage)
   ↓
Chrome Storage API
   ↓
Background Service Worker reads
   ↓
Used in AI generation
```

## Storage Architecture

### Storage Package

**Location**: `packages/storage/lib/`

The storage package provides a unified interface for Chrome storage:

- **Base Storage**: Generic storage wrapper (`base.ts`)
- **Implementations**: Type-specific storage classes
  - `user-profile-storage.ts`: User profile data
  - `resume-storage.ts`: Resume data (raw text + parsed)
  - `api-config-storage.ts`: API key and configuration
  - `applications-storage.ts`: Tracked applications
  - `preferences-storage.ts`: User preferences
  - `jd-storage.ts`: Job descriptions
  - `ai-cache-storage.ts`: Cached AI responses
  - `cover-letter-template-storage.ts`: Cover letter templates

### Storage Structure

```typescript
// Example: User Profile Storage
interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  skills: string[];
  experience: Experience[];
}

// Storage is keyed and typed
const storage = createStorage<UserProfile>(
  'jobestry-user-profile',
  defaultProfile,
  { storageEnum: StorageEnum.Local }
);
```

### Storage Features

- **Type Safety**: Full TypeScript support
- **Live Updates**: React hooks for reactive updates
- **Default Values**: Automatic defaults for missing data
- **Validation**: Type checking and validation
- **Persistence**: Chrome local storage API

## Message Passing

### Message Types

Messages are typed and routed through the background service worker:

```typescript
type MessageType =
  | GenerateResponseRequest
  | GenerateCoverLetterRequest
  | ImproveCoverLetterRequest
  | GenerateJobInsightsRequest
  | BatchGenerationRequest
  | FieldGenerateRequest
  | SmartFillRequest
  | { type: 'CHECK_READY' }
  | { type: 'GET_PROFILE' }
  | { type: 'AI_CHAT'; question: string }
  | ...
```

### Communication Patterns

#### 1. Content UI → Background

```typescript
// In Content UI
const response = await chrome.runtime.sendMessage({
  type: 'GENERATE_RESPONSE',
  question: 'Why do you want this job?',
  jobDescription: '...',
  fieldType: 'textarea'
});
```

#### 2. Content Script → Content UI

```typescript
// In Content Script
window.postMessage({
  __jobestry: true,
  type: 'JOBESTRY_FIELDS_DETECTED',
  fields: [...],
  jobDescriptionText: '...'
}, '*');

// In Content UI
window.addEventListener('message', (event) => {
  if (event.data.__jobestry) {
    // Handle message
  }
});
```

#### 3. Content UI → Content Script

```typescript
// In Content UI
window.postMessage({
  __jobestry: true,
  type: 'JOBESTRY_REQUEST_FILL_ALL'
}, '*');
```

### Message Flow Diagram

```
┌─────────────┐
│ Content UI  │
└──────┬──────┘
       │ window.postMessage
       ↓
┌─────────────┐      chrome.runtime.sendMessage
│Content Script│ ←──────────────────────────┐
└──────┬──────┘                             │
       │                                    │
       │ window.postMessage                │
       ↓                                    │
┌─────────────┐                            │
│ Background  │ ────────────────────────────┘
│  Service    │
│   Worker    │
└──────┬──────┘
       │
       │ HTTP Request
       ↓
┌─────────────┐
│ Gemini API  │
└─────────────┘
```

## Key Components

### Form Detector

**Location**: `pages/content/src/form-detector.ts`

The form detector uses multiple strategies:

1. **Selector Matching**: Common selectors for job sites
2. **Heuristic Analysis**: Field labels, placeholders, names
3. **Pattern Matching**: Regex patterns for common field types
4. **Context Analysis**: Surrounding elements and structure

**Field Types Detected**:
- Standard: firstName, lastName, email, phone, location
- Professional: linkedin, github, portfolio
- Custom: textarea, input fields with custom questions
- File uploads: resume upload fields

### AI Service

**Location**: `chrome-extension/src/background/gemini-service.ts`

Handles all AI operations:

- **Response Generation**: Single field responses
- **Cover Letter Generation**: Full cover letters
- **Cover Letter Improvement**: Modify existing letters
- **Job Insights**: Fit analysis and keyword extraction
- **Caching**: Cache responses to reduce API calls

**Prompt Engineering**:
- System prompts define AI behavior
- User prompts include context (resume, JD, question)
- Style presets modify tone and style
- Security measures prevent prompt injection

### Smart Fill Service

**Location**: `chrome-extension/src/background/smart-fill-service.ts`

Intelligent form filling:

- **Quick Fill**: Standard fields from profile
- **AI Fill**: Custom fields with AI generation
- **Batch Fill**: Fill multiple fields efficiently
- **Resume Summary**: Extract key info from resume

### Batch Processor

**Location**: `chrome-extension/src/background/batch-processor.ts`

Efficient batch operations:

- Generate multiple responses in one API call
- Optimize token usage
- Handle errors gracefully
- Parse JSON responses

## Build System

### Vite Configuration

**Location**: `packages/vite-config/`

- Shared Vite configuration
- Content script builders
- HMR (Hot Module Reload) support
- TypeScript compilation

### Turborepo

Monorepo management:

- Parallel builds
- Caching
- Task dependencies
- Workspace management

## Security Considerations

### API Key Security

- Stored locally in Chrome storage
- Never transmitted except to Google API
- Masked in UI displays
- Validated before use

### Data Privacy

- All data stored locally
- No external data collection
- Direct API calls (no proxy)
- User controls all data

### Prompt Injection Protection

- Input sanitization
- System prompt isolation
- Security-focused prompts
- Error handling for malicious input

## Performance Optimizations

### Caching

- AI responses cached by question + context
- Reduces API calls for similar questions
- Cache invalidation on profile/resume updates

### Batch Operations

- Multiple fields filled in one API call
- Reduces network overhead
- Faster user experience

### Lazy Loading

- Components loaded on demand
- Shadow DOM isolation
- Minimal impact on page performance

## Extension Lifecycle

1. **Installation**: Extension installed, background worker starts
2. **Page Load**: Content scripts injected
3. **Field Detection**: Forms detected, fields identified
4. **User Interaction**: User opens sidebar, generates responses
5. **API Calls**: Background worker makes API calls
6. **Field Filling**: Content script fills form fields
7. **State Updates**: UI updates reflect changes

## Future Architecture Considerations

- **Offline Support**: Service worker caching
- **Multiple AI Providers**: Plugin architecture for different APIs
- **Sync**: Cross-device synchronization
- **Analytics**: Optional usage analytics (opt-in)
- **Themes**: Customizable UI themes

## References

- [Chrome Extensions Architecture](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
