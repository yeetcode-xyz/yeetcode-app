#!/bin/bash

# Release helper script
# This script helps create releases with proper validation

set -e

echo "🚀 YeetCode Release Helper"
echo "========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash changes first."
    git status --short
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ You must be on the main branch to create a release"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run pre-release checks
echo "🧪 Running pre-release checks..."
npm run dev:check

echo "✅ All checks passed!"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: v$CURRENT_VERSION"

# Ask for release type
echo ""
echo "What type of release would you like to create?"
echo "1) Patch (bug fixes) - v$CURRENT_VERSION -> v$(node -p "require('semver').inc('$CURRENT_VERSION', 'patch')")"
echo "2) Minor (new features) - v$CURRENT_VERSION -> v$(node -p "require('semver').inc('$CURRENT_VERSION', 'minor')")"
echo "3) Major (breaking changes) - v$CURRENT_VERSION -> v$(node -p "require('semver').inc('$CURRENT_VERSION', 'major')")"
echo "4) Custom version"
echo "5) Cancel"

read -p "Enter your choice (1-5): " CHOICE

case $CHOICE in
    1)
        RELEASE_TYPE="patch"
        ;;
    2)
        RELEASE_TYPE="minor"
        ;;
    3)
        RELEASE_TYPE="major"
        ;;
    4)
        read -p "Enter custom version (e.g., 1.2.3): " CUSTOM_VERSION
        if [ -z "$CUSTOM_VERSION" ]; then
            echo "❌ Version cannot be empty"
            exit 1
        fi
        RELEASE_TYPE="custom"
        ;;
    5)
        echo "👋 Release cancelled"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Create the release
echo ""
echo "🏷️  Creating release..."

if [ "$RELEASE_TYPE" = "custom" ]; then
    npm version "$CUSTOM_VERSION"
    NEW_VERSION="$CUSTOM_VERSION"
else
    npm version "$RELEASE_TYPE"
    NEW_VERSION=$(node -p "require('./package.json').version")
fi

echo "✅ Version bumped to v$NEW_VERSION"

# Push the tag
echo "📤 Pushing tag to GitHub..."
git push --follow-tags

echo ""
echo "🎉 Release v$NEW_VERSION created successfully!"
echo ""
echo "📋 What happens next:"
echo "• GitHub Actions will automatically run tests"
echo "• If tests pass, it will build the app for all platforms"
echo "• A GitHub release will be created with download links"
echo "• You can monitor progress at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/')/actions"
echo ""
echo "🔗 View the release at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/')/releases/tag/v$NEW_VERSION" 