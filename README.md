# yeetcode-app

An app version of the old YeetCode bot (but better)

## Setup

### Environment Variables

You can set up your environment variables in two ways:

#### Option 1: Using the setup script

Run the following command and follow the prompts:

```bash
npm run setup-env
```

#### Option 2: Manual setup

Create a `.env` file in the root directory with the following variables:

```
API_URL=YOUR_API_URL
API_KEY=YOUR_API_KEY

LEETCODE_API_KEY=YOUR_API_KEY
LEETCODE_API_URL=YOUR_API_URL

AWS_ACCESS_KEY_ID=YOUR_API_KEY
AWS_SECRET_ACCESS_KEY=YOUR_API_KEY

VITE_PUBLIC_POSTHOG_KEY=YOUR_API_KEY
VITE_PUBLIC_POSTHOG_HOST=YOUR_API_URL

RESEND_API_KEY=YOUR_API_KEY

AWS_REGION=YOUR_AWS_REGION
USERS_TABLE=YOUR_USERS_TABLE
GROUPS_TABLE=YOUR_GROUPS_TABLE
DAILY_TABLE=YOUR_DAILY_TABLE
DUELS_TABLE=YOUR_DUELS_TABLE
BOUNTIES_TABLE=YOUR_BOUNTIES_TABLE
```

Replace every assignment with your actual API key/IDs.

### Installation

```bash
npm install
npm start
```
