# YeetCode App

A competitive programming practice application built with Electron.

## Development

### Prerequisites
- Node.js (LTS version recommended)
- npm or yarn

### Installation
```bash
npm install
```

### Running the app
```bash
npm run dev
```

### Building the app
```bash
npm run build
```

## macOS Signing and Notarization

### Prerequisites
1. Apple Developer Account ($99/year)
2. Developer ID Application Certificate
3. App Specific Password

### Setup
1. Place your `YeetCode_Certificate.p12` file in the project root
2. Update credentials in `package-mac-signed.sh` (already configured)
3. Ensure you have the required entitlements file (`assets/entitlements.mac.plist`)

### Building Signed App
For signed and notarized build:
```bash
bash package-mac-signed.sh
```

For unsigned build (testing):
```bash
npm run package:mac-unsigned
```

### Notes
- First-time notarization can take 8-12 hours
- Subsequent notarizations typically complete in 10 minutes
- The signed app will be available in `dist-electron/` directory
- Universal build supports both Intel and Apple Silicon Macs

## Testing
```bash
npm test
npm run test:e2e
```

## Distribution
The signed `.dmg` file can be distributed without security warnings on macOS.
