const func = require('@jupyterlab/testutils/lib/jest-config');
module.exports = func('notebook', __dirname);

// const path = require("path");
//
// const name = 'notebook';
// const baseDir = __dirname;
//
// module.exports = {
//   preset: 'ts-jest/presets/js-with-babel',
//   moduleNameMapper: {
//     '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
//     '\\.(gif|ttf|eot|svg)$': '@jupyterlab/testutils/lib/jest-file-mock.js'
//   },
//   setupFilesAfterEnv: ['@jupyterlab/testutils/lib/jest-script.js'],
//   setupFiles: ['@jupyterlab/testutils/lib/jest-shim.js'],
//   testPathIgnorePatterns: ['/dev_mode/', '/lib/', '/node_modules/'],
//   moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
//   rootDir: path.resolve(path.join(baseDir, '..', '..')),
//   reporters: ['default', 'jest-junit'],
//   collectCoverageFrom: [
//     `packages/${name}/src/**.{ts,tsx}`,
//     `!packages/${name}/src/*.d.ts`
//   ],
//   coverageReporters: ['json', 'lcov', 'text', 'html'],
//   coverageDirectory: path.join(baseDir, 'coverage'),
//   testRegex: `tests\/test-${name}\/src\/.*\.spec\.tsx?$`,
//   globals: {
//     'ts-jest': {
//       diagnostics: false,
//       tsConfig: `./tsconfig.json`
//     }
//   }
// };
//
// // globals: {
// //   'ts-jest': {
// //     diagnostics: {
// //       pathRegex: /\.(spec|test)\.ts$/
// //     }
// //   }
// // }
