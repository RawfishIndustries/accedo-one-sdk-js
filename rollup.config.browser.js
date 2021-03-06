/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify'; // eslint-disable-line import/extensions

export default {
  input: 'src/browser/index.js',
  output: {
    file: 'dist/accedo-one.umd.min.js',
    format: 'umd',
    name: 'accedoOne',
    sourcemap: false,
  },
  plugins: [
    nodeResolve({
      module: true,
      jsnext: true,

      // some package.json files have a `browser` field which
      // specifies alternative files to load for people bundling
      // for the browser. If that's you, use this option, otherwise
      // pkg.browser will be ignored
      browser: true,
    }),
    commonjs(),
    buble(),
    uglify(),
  ],
};
