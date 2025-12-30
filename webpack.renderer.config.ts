import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: ['style-loader', 'css-loader', 'postcss-loader'],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  devtool: 'source-map',
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
