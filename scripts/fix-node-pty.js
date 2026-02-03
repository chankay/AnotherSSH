#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Fixing node-pty permissions...');

const platform = os.platform();
const arch = os.arch();

if (platform === 'darwin' || platform === 'linux') {
  const spawnHelperPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'node-pty',
    'prebuilds',
    `${platform}-${arch}`,
    'spawn-helper'
  );

  if (fs.existsSync(spawnHelperPath)) {
    try {
      fs.chmodSync(spawnHelperPath, 0o755);
      console.log(`✅ Fixed permissions for: ${spawnHelperPath}`);
    } catch (error) {
      console.error(`❌ Failed to fix permissions: ${error.message}`);
    }
  } else {
    console.log(`⚠️  spawn-helper not found at: ${spawnHelperPath}`);
  }
}

console.log('Done!');
