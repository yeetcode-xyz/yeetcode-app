# YeetCode App

**YeetCode App** is a desktop application that makes competitive programming practice fun and social. Built with Electron and React, it gamifies LeetCode practice with XP, streaks, duels, and competitive features.

## Features

### 🎯 Core Features
- **LeetCode Integration** - Connect your LeetCode account and track problem submissions in real-time
- **Study Groups** - Create or join groups with invite codes, compete on group leaderboards
- **XP System** - Earn XP for solving problems (Easy: 100 XP, Medium: 300 XP, Hard: 500 XP)
- **Daily Streaks** - Maintain streaks by solving daily LeetCode problems
- **Real-time Leaderboards** - Global, friends, group, and university leaderboards with live updates

### ⚔️ Competitive Features
- **Duels** - Challenge friends to head-to-head coding competitions
  - Normal Duels: Race to solve a problem fastest
  - Wager Duels: Bet XP on your skills (winner takes all)
  - Duel History: Track your wins/losses and completion times
- **Bounty System** - Time-limited challenges with XP rewards
- **Daily Challenges** - Complete LeetCode's daily problem for bonus XP

### 🏆 Leaderboards
- **Friends Leaderboard** - Compete with your added friends
- **Group Leaderboard** - See rankings within your study group
- **University Leaderboard** - Compare with students from your university
- **My University Leaderboard** - Personal ranking at your school

### 🎨 User Experience
- **Magic Link Authentication** - Secure email-based login with 6-digit codes
- **Profile Customization** - Set display names, add profile pictures
- **Notifications** - Desktop notifications for duels, bounties, and achievements
- **Smooth Animations** - Framer Motion animations for polished UI

## Tech Stack

### Frontend
- **Electron** - Cross-platform desktop framework
- **React** - UI components with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animation library
- **Axios** - HTTP client for API calls

### Backend
- **FastAPI** - Python REST API server
- **AWS DynamoDB** - NoSQL database for user data
- **AWS SDK** - Cloud services integration
- **Resend** - Email service for magic links
- **LeetCode GraphQL API** - Problem data and validation

## Development

### Prerequisites
- Node.js 18+ (LTS version recommended)
- npm or yarn
- Python 3.9+ (for backend development)

### Installation
```bash
# Install frontend dependencies
npm install

# Install backend dependencies (if running locally)
cd scripts/fastapi
pip install -r requirements.txt
```

### Environment Setup
Create a `.env` file in the project root:
```env
FASTAPI_URL=your_backend_url
YETCODE_API_KEY=your_api_key
```

### Running the App

#### Development Mode
```bash
# Start both Electron and Vite dev server
npm run dev

# Or start Electron separately
npm run start
```

#### Production Build
```bash
# Build frontend
npm run build

# Package for distribution
npm run package

# Create installers
npm run make
```

### Packaging Options
```bash
# Package with electron-builder
npm run package:builder

# macOS unsigned build
npm run package:mac-unsigned

# Publish (requires configuration)
npm run publish
```

## Testing

### Unit Tests (Vitest)
```bash
# Run tests
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Visual test UI
npm run test:ui
```

### E2E Tests (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Visual test UI
npm run test:e2e:ui
```

### Run All Tests
```bash
npm run test:all
```

## Code Quality

### Formatting
```bash
# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks
The project uses lint-staged to enforce code quality:
```bash
npm run enforce-precommit-hooks
```

## Project Structure

```
yeetcode-app/
├── src/
│   ├── components/          # React components
│   │   ├── leaderboard/     # Leaderboard-related components
│   │   ├── App.jsx          # Main app component
│   │   ├── WelcomeStep.jsx  # Onboarding steps
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── index.js             # Electron main process
│   ├── preload.js           # Electron preload script
│   └── renderer.jsx         # React entry point
├── scripts/
│   └── fastapi/             # Python backend
│       ├── main.py          # FastAPI app
│       ├── routes/          # API endpoints
│       ├── aws.py           # AWS operations
│       └── ...
├── dist/                    # Built frontend files
├── out/                     # Packaged applications
└── tests/                   # Test files
```

## Security

- **Context Isolation** - Electron security best practices enabled
- **Input Validation** - All user inputs validated in preload script
- **API Key Protection** - Keys stored securely, never exposed to frontend
- **Sandboxing** - Renderer process runs in sandboxed environment
- **URL Whitelisting** - Only approved domains (leetcode.com, wa.me, t.me) allowed

## Contributing

Contributions are welcome! Please:
1. Follow the existing code style (Prettier formatting)
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is private and not licensed for public use.

