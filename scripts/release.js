#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(msg) {
  console.log(`\x1b[36m[release]\x1b[0m ${msg}`);
}

if (process.argv.length < 3) {
  console.error('Usage: node scripts/release.js <version>');
  process.exit(1);
}

const version = process.argv[2].replace(/^v/, '');
const branch = `release/v${version}`;
const commitMsg = `chore: release v${version}`;

// 1. Update package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
log(`Updated package.json to version ${version}`);

// 2. Update version in src/index.js
const indexPath = path.join(__dirname, '../src/index.js');
let indexSrc = fs.readFileSync(indexPath, 'utf8');
if (indexSrc.match(/const version = ['"`][^'"`]+['"`]/)) {
  indexSrc = indexSrc.replace(/const version = ['"`][^'"`]+['"`]/, `const version = '${version}'`);
  log('Updated version in src/index.js');
} else {
  // Insert near the top after first require/const block
  indexSrc = indexSrc.replace(/(const [^;]+;\s*)+/, m => m + `\nconst version = '${version}';\n`);
  log('Inserted version in src/index.js');
}
fs.writeFileSync(indexPath, indexSrc);

// 3. Update version in src/components/App.jsx
const appPath = path.join(__dirname, '../src/components/App.jsx');
let appSrc = fs.readFileSync(appPath, 'utf8');
if (appSrc.match(/const APP_VERSION = ['"`][^'"`]+['"`]/)) {
  appSrc = appSrc.replace(/const APP_VERSION = ['"`][^'"`]+['"`]/, `const APP_VERSION = '${version}'`);
  log('Updated version in src/components/App.jsx');
} else {
  // Insert near the top after imports
  appSrc = appSrc.replace(/(import[^;]+;\s*)+/, m => m + `\nconst APP_VERSION = '${version}';\n`);
  log('Inserted version in src/components/App.jsx');
}
fs.writeFileSync(appPath, appSrc);

// 4. Optionally update .github/workflows/release.yml (if version example present)
const relYmlPath = path.join(__dirname, '../.github/workflows/release.yml');
if (fs.existsSync(relYmlPath)) {
  let relYml = fs.readFileSync(relYmlPath, 'utf8');
  // Update example version in workflow_dispatch input if present
  relYml = relYml.replace(/version: v?\d+\.\d+\.\d+/, `version: v${version}`);
  fs.writeFileSync(relYmlPath, relYml);
  log('Updated version example in .github/workflows/release.yml');
}

// 5. Create release branch, commit, push, and open PR
try {
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git checkout -b ${branch}`, { stdio: 'inherit' });
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });
  log('Pushed branch to origin');
  execSync(`gh pr create --fill --base main --head ${branch}`, { stdio: 'inherit' });
  log('Opened PR to main');
} catch (err) {
  console.error('Error during git or gh operations:', err.message);
  process.exit(1);
}

log(`Release v${version} process complete!`); 