#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the version from command line args
const newVersion = process.argv[2];

// Validate version format (semver: x.y.z)
const versionRegex = /^\d+\.\d+\.\d+$/;

if (!newVersion || !versionRegex.test(newVersion)) {
  console.error('❌ Invalid version format!');
  console.error('');
  console.error('Usage: npm run bump-version <version>');
  console.error('Example: npm run bump-version 0.2.0');
  console.error('         npm run bump-version 1.0.0');
  console.error('');
  console.error('Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.2.3)');
  process.exit(1);
}

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log(`📦 Bumping version: ${packageJson.version} → ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Updated package.json');

// Update src/index.js
const indexJsPath = path.join(__dirname, '..', 'src', 'index.js');
let indexJs = fs.readFileSync(indexJsPath, 'utf8');

// Replace the version line
indexJs = indexJs.replace(
  /const version = '[^']+';/,
  `const version = '${newVersion}';`
);

fs.writeFileSync(indexJsPath, indexJs);
console.log('✅ Updated src/index.js');

console.log('');
console.log('🎉 Version bumped successfully!');
console.log('');
console.log('Next steps:');
console.log('  1. Review the changes');
console.log('  2. Commit: git add package.json src/index.js');
console.log(`  3. Commit: git commit -m "Bump version to ${newVersion}"`);
console.log('  4. Push: git push origin main');
console.log('  5. Workflow will auto-deploy the new version!');
console.log('');
console.log(`New version: ${newVersion}`);
