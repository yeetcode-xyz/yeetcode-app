#!/bin/bash

# Quick development checks script
# Run this before pushing to catch issues early

echo "🚀 Running quick development checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm ci --silent

echo "🎨 Checking code formatting..."
if npm run format:check --silent; then
    echo "✅ Code formatting is correct"
else
    echo "❌ Code formatting issues found"
    echo "💡 Run 'npm run format' to fix them"
    exit 1
fi

echo "🧪 Running unit tests..."
if npm run test:run --silent; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests failed"
    exit 1
fi

echo "🎉 All checks passed! You're ready to push." 