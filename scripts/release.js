#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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

// Check for git
try {
  execSync('git --version', { stdio: 'ignore' });
} catch (e) {
  console.error('git is required for this script.');
  process.exit(1);
}

// Check for gh CLI
let hasGh = true;
try {
  execSync('gh --version', { stdio: 'ignore' });
} catch (e) {
  hasGh = false;
  log('GitHub CLI (gh) not found. PR creation will be skipped.');
}

// 1. Update package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
log(`Updated package.json to version ${version}`);

// Helper: Replace all version-like strings in a file
function replaceAllVersions(filePath, oldVersion, newVersion) {
  let src = fs.readFileSync(filePath, 'utf8');
  // Replace v1.2.3, 1.2.3, '1.2.3', "1.2.3", `1.2.3`, etc.
  const versionPatterns = [
    new RegExp(`v?${oldVersion.replace(/\./g, '\\.')}`, 'g'),
    /const version = ['"`][^'"`]+['"`]/g,
    /const APP_VERSION = ['"`][^'"`]+['"`]/g,
  ];
  src = src.replace(versionPatterns[0], `v${newVersion}`); // v1.2.3 and 1.2.3
  src = src.replace(versionPatterns[1], `const version = '${newVersion}'`);
  src = src.replace(versionPatterns[2], `const APP_VERSION = '${newVersion}'`);
  fs.writeFileSync(filePath, src);
  log(`Updated all version strings in ${filePath}`);
}

// 2. Update all version strings in src/index.js
replaceAllVersions(path.join(__dirname, '../src/index.js'), oldVersion, version);

// 3. Update all version strings in src/components/App.jsx
replaceAllVersions(path.join(__dirname, '../src/components/App.jsx'), oldVersion, version);

// 4. Git branch, commit, push, PR automation
try {
  // Check for changes
  const status = execSync('git status --porcelain').toString();
  if (!status.trim()) {
    log('No changes to commit. Exiting.');
    process.exit(0);
  }

  execSync('git add .', { stdio: 'inherit' });

  // Check if branch exists locally
  let branchExists = false;
  try {
    execSync(`git rev-parse --verify ${branch}`, { stdio: 'ignore' });
    branchExists = true;
  } catch (e) {
    branchExists = false;
  }

  if (branchExists) {
    execSync(`git checkout ${branch}`, { stdio: 'inherit' });
  } else {
    execSync(`git checkout -b ${branch}`, { stdio: 'inherit' });
  }

  // Commit (amend if already committed for this version)
  let alreadyCommitted = false;
  try {
    const logOut = execSync('git log -1 --pretty=%B').toString();
    if (logOut.includes(commitMsg)) alreadyCommitted = true;
  } catch (e) {}

  if (!alreadyCommitted) {
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  } else {
    log('Commit for this version already exists. Skipping commit.');
  }

  // Push (force if remote branch exists)
  let remoteBranchExists = false;
  try {
    execSync(`git ls-remote --exit-code --heads origin ${branch}`, { stdio: 'ignore' });
    remoteBranchExists = true;
  } catch (e) {
    remoteBranchExists = false;
  }
  if (remoteBranchExists) {
    execSync(`git push -u origin ${branch} --force`, { stdio: 'inherit' });
  } else {
    execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });
  }
  log('Pushed branch to origin');

  // Create PR if gh is available and PR does not already exist
  if (hasGh) {
    let prExists = false;
    try {
      const prList = execSync(`gh pr list --head ${branch} --json number`).toString();
      if (prList.includes('number')) prExists = true;
    } catch (e) {}
    if (!prExists) {
      execSync(`gh pr create --fill --base main --head ${branch}`, { stdio: 'inherit' });
      log('Opened PR to main');
    } else {
      log('PR already exists for this branch.');
    }
  } else {
    log('Skipping PR creation (gh not available).');
  }
} catch (err) {
  console.error('Error during git or gh operations:', err.message);
  process.exit(1);
}

log(`Release v${version} process complete!`); 