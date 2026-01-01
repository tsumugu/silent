import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: {
    index: './src/main/index.ts',
    trayRenderWorker: './src/main/workers/trayRenderWorker.ts',
    'preload/hidden-preload': './src/preload/hidden-preload.ts',
    'preload/about-preload': './src/preload/about-preload.ts',
    'preload/preferences-preload': './src/preload/preferences-preload.ts',
  },
  output: {
    filename: '[name].js',
  },
  // Put your normal webpack config below here
  devtool: 'source-map',
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};
