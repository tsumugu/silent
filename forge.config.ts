import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

import { PublisherGithub } from '@electron-forge/publisher-github';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon.icns',
    osxSign: {
      identity: '-', // Ad-Hoc Signing (Required base config)
    },
  },
  hooks: {
    postPackage: async (config, { outputPaths, platform }) => {
      if (platform !== 'darwin' || !outputPaths || outputPaths.length === 0) return;

      const path = require('path');
      const appPath = path.join(outputPaths[0], 'Silent.app');
      console.log(`[Manual Signing] Signing app at: ${appPath}`);

      const { execSync } = require('child_process');
      try {
        // Sign the internal binary first
        execSync(`codesign --force --deep --options runtime --entitlements ./entitlements.plist --sign - "${appPath}/Contents/MacOS/Silent"`, { stdio: 'inherit' });
        // Sign the whole bundle
        execSync(`codesign --force --deep --options runtime --entitlements ./entitlements.plist --sign - "${appPath}"`, { stdio: 'inherit' });

        console.log('[Manual Signing] Verification:');
        execSync(`codesign -dvvv --entitlements - "${appPath}"`, { stdio: 'inherit' });
        console.log('[Manual Signing] Complete.');
      } catch (e) {
        console.error('[Manual Signing] Failed:', e);
        throw e;
      }
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG({
      icon: './assets/icon.icns',
      overwrite: true
    }),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'tsumugu',
        name: 'silent'
      },
      prerelease: false,
      draft: false
    })
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' https://*.googleusercontent.com https://*.ytimg.com https://*.ggpht.com https://*.youtube.com data: blob:; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.googleusercontent.com https://*.ytimg.com https://*.ggpht.com https://*.youtube.com data: blob:;",
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/renderer/index.html',
            js: './src/renderer/index.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload/ui-preload.ts',
            },
          },
          {
            html: './src/renderer/about.html',
            js: './src/renderer/about.tsx',
            name: 'about_window',
            preload: {
              js: './src/preload/about-preload.ts',
            },
          },
          {
            html: './src/renderer/preferences.html',
            js: './src/renderer/preferences.tsx',
            name: 'preferences_window',
            preload: {
              js: './src/preload/preferences-preload.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: false, // Disabled to prevent Keychain prompt on Ad-Hoc builds
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false, // Disabled for Ad-Hoc signing
      [FuseV1Options.OnlyLoadAppFromAsar]: false, // Disabled for Ad-Hoc signing
    }),
  ],
};

export default config;
