const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

if (process.env.CAPACITOR_PLATFORM_NAME === 'ios') {
  const file = path.resolve('ios/App/App/Info.plist');
  if (!fs.existsSync(file)) {
    throw new Error('iOS project is incomplete. Restore the Xcode project or run npx cap add ios on your Mac before syncing. Keep your AppIcon assets and GoogleService-Info.plist.');
  }
  if (process.platform !== 'darwin') throw new Error('Sync the iOS app on your Mac so photo permissions can be configured.');
  for (const [key, value] of Object.entries({
    NSCameraUsageDescription: 'Tabedaar uses your camera to attach order photos and delivery proofs.',
    NSPhotoLibraryUsageDescription: 'Tabedaar lets you choose photos for orders and payment proofs.',
  })) {
    try { execFileSync('/usr/bin/plutil', ['-replace', key, '-string', value, file], { stdio: 'pipe' }); }
    catch { execFileSync('/usr/bin/plutil', ['-insert', key, '-string', value, file], { stdio: 'inherit' }); }
  }
  execFileSync('/usr/bin/plutil', ['-lint', file], { stdio: 'inherit' });
}