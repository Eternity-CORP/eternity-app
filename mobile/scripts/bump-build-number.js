#!/usr/bin/env node

/**
 * bump-build-number.js
 *
 * Automatically increments build numbers for iOS and Android
 * after npm version command updates the semver version.
 *
 * Usage: node scripts/bump-build-number.js
 *
 * This script:
 * - Reads app.json
 * - Increments ios.buildNumber (string format)
 * - Increments android.versionCode (integer format)
 * - Saves changes back to app.json
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

function main() {
  try {
    console.log('📱 Bumping build numbers...');

    // Read app.json
    const appJsonRaw = fs.readFileSync(APP_JSON_PATH, 'utf8');
    const appJson = JSON.parse(appJsonRaw);

    // Get current build numbers
    const currentIosBuildNumber = parseInt(appJson.expo.ios.buildNumber, 10);
    const currentAndroidVersionCode = appJson.expo.android.versionCode;

    console.log(`   Current iOS buildNumber: ${currentIosBuildNumber}`);
    console.log(`   Current Android versionCode: ${currentAndroidVersionCode}`);

    // Increment build numbers
    const newIosBuildNumber = currentIosBuildNumber + 1;
    const newAndroidVersionCode = currentAndroidVersionCode + 1;

    // Update app.json
    appJson.expo.ios.buildNumber = String(newIosBuildNumber);
    appJson.expo.android.versionCode = newAndroidVersionCode;

    console.log(`   New iOS buildNumber: ${newIosBuildNumber}`);
    console.log(`   New Android versionCode: ${newAndroidVersionCode}`);

    // Write back to file with proper formatting
    fs.writeFileSync(
      APP_JSON_PATH,
      JSON.stringify(appJson, null, 2) + '\n',
      'utf8'
    );

    console.log('✅ Build numbers bumped successfully!');
    console.log('');

  } catch (error) {
    console.error('❌ Error bumping build numbers:', error.message);
    process.exit(1);
  }
}

main();
