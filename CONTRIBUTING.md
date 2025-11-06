# Contributing to YeetCode

First off, thank you for considering contributing to YeetCode! 🎉

YeetCode is an open-source competitive programming platform developed and maintained by [Siddhant](https://github.com/sidmogoesbrrr) and [Akeen](https://github.com/akeenkarkare).

## Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)



## How Can I Contribute?

### Before You Start: Open an Issue First! 📝

**IMPORTANT:** Before working on any contribution, please open an issue to discuss what you'd like to do. This helps us:
- Avoid duplicate work
- Ensure your contribution aligns with the project's direction
- Provide guidance and context
- Save you time on work that might not be accepted

### Ways to Contribute

- 🐛 **Report bugs** - Found something broken? Let us know!
- 💡 **Suggest features** - Have an idea? We'd love to hear it!
- 📖 **Improve documentation** - Help others understand the project better
- 🔧 **Fix bugs** - Tackle an existing issue
- ✨ **Add features** - Implement something new (after discussion)
- ✅ **Write tests** - Improve code coverage

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+ and pip
- **Git**
- A **LeetCode account** for testing

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/yeetcode-app.git
   cd yeetcode-app
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/sidmo2006/yeetcode-app.git
   ```

4. **Install frontend dependencies:**
   ```bash
   npm install
   ```

5. **Set up backend:**
   ```bash
   cd scripts/fastapi
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

6. **Configure environment variables:**
   - Copy `.env.example` to `.env` in the root directory
   - Copy `scripts/fastapi/.env.example` to `scripts/fastapi/.env`
   - Fill in the required values (contact maintainers for test credentials if needed)

### Running the Application

**Frontend (Electron + React):**
```bash
npm run dev      # Start development server
npm run start    # Start Electron app
```

**Backend (FastAPI):**
```bash
cd scripts/fastapi
source .venv/bin/activate
python3 main.py
```

**Run tests:**
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
```

## Development Workflow

1. **Sync your fork:**
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes** following our [code style guidelines](#code-style-guidelines)

4. **Test your changes:**
   - Run existing tests: `npm test`
   - Test manually in the app
   - Add new tests if applicable

5. **Commit your changes** following our [commit message guidelines](#commit-message-guidelines)

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** following our [PR process](#pull-request-process)

## Code Style Guidelines

### General Principles

- **Write clean, readable code** - Code is read more often than it's written
- **Use descriptive names** - Variable and function names should explain their purpose
- **Keep functions small** - Each function should do one thing well
- **Comment when necessary** - Explain *why*, not *what*
- **Handle errors gracefully** - Never fail silently

### JavaScript/React

- **Formatting:** We use Prettier (runs automatically on commit)
- **Naming conventions:**
  - Components: `PascalCase` (e.g., `LeaderboardSection.jsx`)
  - Functions/variables: `camelCase` (e.g., `getUserData`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **File organization:**
  - One component per file
  - Related components in the same directory
  - Hooks in `/src/hooks/`
  - Utilities in `/src/utils/`

### Python (FastAPI Backend)

- **Style:** Follow PEP 8
- **Type hints:** Use type annotations where possible
- **Naming conventions:**
  - Functions/variables: `snake_case`
  - Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
- **Imports:** Group and order imports (stdlib, third-party, local)

### Code Quality

- **No console.log in production code** - Use the logger utilities instead
- **Validate user inputs** - Never trust client data
- **Use environment variables** - Never hardcode secrets or configuration
- **Write tests** - Especially for new features and bug fixes

## Commit Message Guidelines

Write clear, meaningful commit messages:

```
<type>: <subject>

<body (optional)>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting, missing semicolons, etc.
- `refactor:` Code restructuring without changing behavior
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates

**Examples:**
```
feat: Add XP multiplier for weekend coding sessions

fix: Resolve crash when loading empty leaderboard

docs: Update installation instructions for Windows users
```

## Pull Request Process

### Before Submitting

- ✅ You've discussed your changes in an issue
- ✅ Your code follows our style guidelines
- ✅ You've tested your changes thoroughly
- ✅ You've updated documentation if needed
- ✅ Your commits have clear messages
- ✅ Your branch is up to date with main

### Submitting Your PR

1. **Fill out the PR template** completely
2. **Link the related issue** using "Fixes #123" or "Closes #123"
3. **Add screenshots/GIFs** for UI changes
4. **Request review** from maintainers

### Review Process

- Maintainers will review your PR within a few days
- We may request changes or ask questions
- Once approved, a maintainer will merge your PR
- Your contribution will be credited in the release notes! 🎉

### After Your PR is Merged

- Delete your feature branch
- Sync your fork with upstream
- Celebrate! You're now a YeetCode contributor! 🚀

## Questions?

- **Have questions?** Open an issue with the "question" label
- **Need help?** Reach out to the maintainers
- **Found a security issue?** See [SECURITY.md](SECURITY.md) for reporting guidelines

## Recognition

All contributors will be recognized in our README and release notes. Thank you for making YeetCode better! ❤️

---

**Happy Coding!** 👨‍💻👩‍💻

*Maintained with ❤️ by [@sidmo2006](https://github.com/sidmo2006) and [@akeen](https://github.com/akeen)*
