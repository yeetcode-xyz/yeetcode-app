# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YeetCode is an Electron-based desktop application for competitive programming practice. It connects to LeetCode accounts, enables study groups, provides real-time leaderboards, and tracks progress through XP and streaks. The app consists of an Electron frontend (React) and a FastAPI Python backend for data management.

## Architecture

### Frontend (Electron + React)
- **Main Process**: `src/index.js` - Electron main process handling IPC, window management, and system integrations
- **Preload Script**: `src/preload.js` - Secure bridge between main and renderer processes with input validation
- **Renderer**: `src/renderer.jsx` - React app entry point
- **Components**: `src/components/` - React components organized by feature
  - Step-based onboarding flow (WelcomeStep, EmailStep, etc.)
  - Leaderboard components in `leaderboard/` subdirectory

### Backend (FastAPI)
- **Server**: `scripts/fastapi/main.py` - Main FastAPI application
- **Routes**: `scripts/fastapi/routes/` - API endpoints organized by feature (auth, groups, duels, etc.)
- **Models**: DynamoDB-based data storage via AWS SDK

### Key Features
- **Magic Link Authentication**: Email-based verification with 6-digit codes
- **Study Groups**: Create/join groups with invite codes, track group leaderboards
- **Duel System**: Real-time competitive coding challenges between users
- **Daily Challenges**: LeetCode daily problem tracking with XP rewards
- **Bounty System**: Time-limited coding challenges with rewards

## Development Commands

### Basic Development
```bash
# Install dependencies
npm install

# Start development (runs both frontend and Electron)
npm run dev
npm run start

# Build the application
npm run build
```

### Testing
```bash
# Run unit tests (Vitest)
npm test
npm run test:run        # Run once
npm run test:coverage   # With coverage
npm run test:ui         # Visual test UI

# Run E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:headed # With browser visible
npm run test:e2e:debug  # Debug mode
npm run test:e2e:ui     # Visual test UI

# Run all tests
npm run test:all
```

### Packaging
```bash
# Package for distribution
npm run package
npm run package:builder       # Using electron-builder
npm run package:mac-unsigned  # macOS unsigned build

# Create installers
npm run make

# Publish (requires configuration)
npm run publish
npm run package:publish
```

### Code Quality
```bash
# Format code (Prettier)
npm run format
npm run format:check

# Linting is handled via lint-staged pre-commit hooks
npm run enforce-precommit-hooks
```

## Important Code Patterns

### IPC Communication
- All IPC handlers are in `src/index.js` with the pattern `ipcMain.handle('method-name', async (event, ...args) => {})`
- Preload script validates inputs and exposes secure APIs via `contextBridge.exposeInMainWorld('electronAPI', {})`
- Always validate user inputs in preload script before sending to main process

### API Integration
- Use axios for all HTTP requests (never fetch)
- FastAPI backend URL and API key from environment variables
- LeetCode GraphQL API for problem data and user validation
- Error handling with try/catch and appropriate fallbacks

### Security Considerations
- Never expose API keys in frontend code
- All URLs validated in preload script (only leetcode.com, wa.me, t.me allowed)
- Input validation for usernames, emails, group codes, etc.
- Sandbox enabled in Electron with context isolation

### Environment Configuration
- `.env` file in project root for environment variables
- `FASTAPI_URL` - Backend API endpoint
- `YETCODE_API_KEY` - Backend authentication
- Development vs production modes handled automatically

## Backend Integration

The app communicates with a FastAPI backend that handles:
- User authentication and management
- Group creation and management
- Duel system and real-time competition
- Daily problem tracking and caching
- XP and progress calculations
- Email services via Resend
- Discord notifications (server-side)

## Key Files to Understand

- `src/index.js` - Main Electron process and all IPC handlers
- `src/preload.js` - Security layer and API validation
- `src/components/App.jsx` - Main React component and step routing
- `src/components/leaderboard/` - Core leaderboard functionality
- `package.json` - Build configuration and scripts
- `vite.config.js` - Frontend build configuration

## Cursor Rules Integration

- Keep code clean, understandable and modular
- Always use axios for API calls
- Never expose API keys in client code
- Handle errors properly without excessive debug logging
- Production-grade code (no mocks or fallbacks)