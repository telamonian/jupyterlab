/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Ensure the integrity of the packages in the repo.
 *
 * Ensure the core package version dependencies match everywhere.
 * Ensure imported packages match dependencies.
 * Ensure a consistent version of all packages.
 * Manage the metapackage meta package.
 */
import * as path from 'path';
import * as utils from './utils';
import {
  ensurePackage,
  ensureUiComponents,
  ensureUiComponentsPure,
  IEnsurePackageOptions
} from './ensure-package';

type Dict<T> = { [key: string]: T };

// Data to ignore.
let MISSING: Dict<string[]> = {
  '@jupyterlab/buildutils': ['path'],
  '@jupyterlab/testutils': ['fs'],
  '@jupyterlab/vega5-extension': ['vega-embed']
};

let UNUSED: Dict<string[]> = {
  '@jupyterlab/apputils': ['@types/react'],
  '@jupyterlab/application': ['@fortawesome/fontawesome-free'],
  '@jupyterlab/apputils-extension': ['es6-promise'],
  '@jupyterlab/services': ['node-fetch', 'ws'],
  '@jupyterlab/testutils': [
    'node-fetch',
    'identity-obj-proxy',
    'jest-raw-loader'
  ],
  '@jupyterlab/test-csvviewer': ['csv-spectrum'],
  '@jupyterlab/vega5-extension': ['vega', 'vega-lite'],
  '@jupyterlab/ui-components': ['@blueprintjs/icons']
};

// Packages that are allowed to have differing versions
let DIFFERENT_VERSIONS: Array<string> = ['vega-lite', 'vega', 'vega-embed'];

let SKIP_CSS: Dict<string[]> = {
  '@jupyterlab/application': ['@jupyterlab/rendermime'],
  '@jupyterlab/application-extension': ['@jupyterlab/apputils'],
  '@jupyterlab/completer': ['@jupyterlab/codeeditor'],
  '@jupyterlab/docmanager': ['@jupyterlab/statusbar'], // Statusbar styles should not be used by status reporters
  '@jupyterlab/docregistry': [
    '@jupyterlab/codeeditor', // Only used for model
    '@jupyterlab/codemirror', // Only used for Mode.findByFileName
    '@jupyterlab/rendermime' // Only used for model
  ],
  '@jupyterlab/documentsearch': [
    '@jupyterlab/cells',
    '@jupyterlab/codeeditor',
    '@jupyterlab/codemirror',
    '@jupyterlab/fileeditor',
    '@jupyterlab/notebook'
  ],
  '@jupyterlab/filebrowser': ['@jupyterlab/statusbar'],
  '@jupyterlab/fileeditor': ['@jupyterlab/statusbar'],
  '@jupyterlab/help-extension': ['@jupyterlab/application'],
  '@jupyterlab/shortcuts-extension': ['@jupyterlab/application'],
  '@jupyterlab/tabmanager-extension': ['@jupyterlab/application'],
  '@jupyterlab/theme-dark-extension': [
    '@jupyterlab/application',
    '@jupyterlab/apputils'
  ],
  '@jupyterlab/theme-light-extension': [
    '@jupyterlab/application',
    '@jupyterlab/apputils'
  ],
  '@jupyterlab/ui-extension': ['@blueprintjs/icons']
};

let pkgData: Dict<any> = {};
let pkgPaths: Dict<string> = {};
let pkgNames: Dict<string> = {};
let depCache: Dict<string> = {};
let locals: Dict<string> = {};

/**
 * Ensure the metapackage package.
 *
 * @returns An array of messages for changes.
 */
function ensureMetaPackage(): string[] {
  let basePath = path.resolve('.');
  let mpPath = path.join(basePath, 'packages', 'metapackage');
  let mpJson = path.join(mpPath, 'package.json');
  let mpData = utils.readJSONFile(mpJson);
  let messages: string[] = [];
  let seen: Dict<boolean> = {};

  utils.getCorePaths().forEach(pkgPath => {
    if (path.resolve(pkgPath) === path.resolve(mpPath)) {
      return;
    }
    let name = pkgNames[pkgPath];
    if (!name) {
      return;
    }
    seen[name] = true;
    let data = pkgData[name];
    let valid = true;

    // Ensure it is a dependency.
    if (!mpData.dependencies[name]) {
      valid = false;
      mpData.dependencies[name] = '^' + data.version;
    }

    if (!valid) {
      messages.push(`Updated: ${name}`);
    }
  });

  // Make sure there are no extra deps.
  Object.keys(mpData.dependencies).forEach(name => {
    if (!(name in seen)) {
      messages.push(`Removing dependency: ${name}`);
      delete mpData.dependencies[name];
    }
  });

  // Write the files.
  if (messages.length > 0) {
    utils.writePackageData(mpJson, mpData);
  }

  // Update the global data.
  pkgData[mpData.name] = mpData;

  return messages;
}

/**
 * Ensure the jupyterlab application package.
 */
function ensureJupyterlab(): string[] {
  let basePath = path.resolve('.');
  let corePath = path.join(basePath, 'dev_mode', 'package.json');
  let corePackage = utils.readJSONFile(corePath);

  corePackage.jupyterlab.extensions = {};
  corePackage.jupyterlab.mimeExtensions = {};
  corePackage.jupyterlab.linkedPackages = {};
  corePackage.dependencies = {};
  corePackage.resolutions = {};

  let singletonPackages: string[] = corePackage.jupyterlab.singletonPackages;
  const coreData = new Map<string, any>();

  utils.getCorePaths().forEach(pkgPath => {
    let dataPath = path.join(pkgPath, 'package.json');
    let data: any;
    try {
      data = utils.readJSONFile(dataPath);
    } catch (e) {
      return;
    }
    coreData.set(data.name, data);
  });

  // Populate the yarn resolutions. First we make sure direct packages have
  // resolutions.
  coreData.forEach((data, name) => {
    // Insist on a restricted version in the yarn resolution.
    corePackage.resolutions[name] = `~${data.version}`;
  });

  // Then fill in any missing packages that should be singletons from the direct
  // package dependencies.
  coreData.forEach(data => {
    if (data.dependencies) {
      Object.entries(data.dependencies).forEach(([dep, version]) => {
        if (
          singletonPackages.includes(dep) &&
          !(dep in corePackage.resolutions)
        ) {
          corePackage.resolutions[dep] = version;
        }
      });
    }
  });

  // At this point, each singleton should have a resolution. Check this.
  let unresolvedSingletons = singletonPackages.filter(
    pkg => !(pkg in corePackage.resolutions)
  );
  if (unresolvedSingletons.length > 0) {
    throw new Error(
      `Singleton packages must have a resolved version number; these do not: ${unresolvedSingletons.join(
        ', '
      )}`
    );
  }

  coreData.forEach((data, name) => {
    // Determine if the package wishes to be included in the top-level
    // dependencies.
    const meta = data.jupyterlab;
    const keep = !!(
      meta &&
      (meta.coreDependency || meta.extension || meta.mimeExtension)
    );
    if (!keep) {
      return;
    }

    // Make sure it is included as a dependency.
    corePackage.dependencies[data.name] = `~${data.version}`;

    // Handle extensions.
    ['extension', 'mimeExtension'].forEach(item => {
      let ext = meta[item];
      if (ext === true) {
        ext = '';
      }
      if (typeof ext !== 'string') {
        return;
      }
      corePackage.jupyterlab[`${item}s`][name] = ext;
    });
  });

  utils.getLernaPaths().forEach(pkgPath => {
    let dataPath = path.join(pkgPath, 'package.json');
    let data: any;
    try {
      data = utils.readJSONFile(dataPath);
    } catch (e) {
      return;
    }

    // watch all src, build, and test files in the Jupyterlab project
    let relativePath = utils.ensureUnixPathSep(
      path.join('..', path.relative(basePath, pkgPath))
    );
    corePackage.jupyterlab.linkedPackages[data.name] = relativePath;
  });

  // Write the package.json back to disk.
  if (utils.writePackageData(corePath, corePackage)) {
    return ['Updated dev mode'];
  }
  return [];
}

/**
 * Ensure the repo integrity.
 */
export async function ensureIntegrity(): Promise<boolean> {
  let messages: Dict<string[]> = {};

  // Pick up all the package versions.
  let paths = utils.getLernaPaths();

  // These two are not part of the workspaces but should be kept
  // in sync.
  paths.push('./jupyterlab/tests/mock_packages/extension');
  paths.push('./jupyterlab/tests/mock_packages/mimeextension');

  const cssImports: Dict<Array<string>> = {};

  // Get the package graph.
  const graph = utils.getPackageGraph();

  // Gather all of our package data and other metadata.
  paths.forEach(pkgPath => {
    // Read in the package.json.
    let data: any;
    try {
      data = utils.readJSONFile(path.join(pkgPath, 'package.json'));
    } catch (e) {
      console.error(e);
      return;
    }

    pkgData[data.name] = data;
    pkgPaths[data.name] = pkgPath;
    pkgNames[pkgPath] = data.name;
    locals[data.name] = pkgPath;
  });

  // Build up an ordered list of CSS imports for each local package.
  Object.keys(locals).forEach(name => {
    const data = pkgData[name];
    const deps: Dict<string> = data.dependencies || {};
    const skip = SKIP_CSS[name] || [];
    const cssData: Dict<Array<string>> = {};

    if (data.jupyterlab && data.jupyterlab.extraStyles) {
      Object.keys(data.jupyterlab.extraStyles).forEach(depName => {
        cssData[depName] = data.jupyterlab.extraStyles[depName];
      });
    }

    Object.keys(deps).forEach(depName => {
      // Bail for skipped imports and known extra styles.
      if (skip.indexOf(depName) !== -1 || depName in cssData) {
        return;
      }
      const depData = graph.getNodeData(depName);
      if (typeof depData.style === 'string') {
        cssData[depName] = [depData.style];
      }
    });

    // Get our CSS imports in dependency order.
    cssImports[name] = [];

    graph.dependenciesOf(name).forEach(depName => {
      if (depName in cssData) {
        cssData[depName].forEach(cssPath => {
          cssImports[name].push(`${depName}/${cssPath}`);
        });
      }
    });
  });

  // Update the metapackage.
  let pkgMessages = ensureMetaPackage();
  if (pkgMessages.length > 0) {
    let pkgName = '@jupyterlab/metapackage';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }

  // Validate each package.
  for (let name in locals) {
    // application-top is handled elsewhere
    if (name === '@jupyterlab/application-top') {
      continue;
    }
    let unused = UNUSED[name] || [];
    // Allow jest-junit to be unused in the test suite.
    if (name.indexOf('@jupyterlab/test-') === 0) {
      unused.push('jest-junit');
    }

    let options: IEnsurePackageOptions = {
      pkgPath: pkgPaths[name],
      data: pkgData[name],
      depCache,
      missing: MISSING[name],
      unused,
      locals,
      cssImports: cssImports[name],
      differentVersions: DIFFERENT_VERSIONS
    };

    if (name === '@jupyterlab/metapackage') {
      options.noUnused = false;
    }

    let pkgMessages = await ensurePackage(options);
    if (pkgMessages.length > 0) {
      messages[name] = pkgMessages;
    }
  }

  // ensure the icon svg imports
  pkgMessages = await ensureUiComponents(pkgPaths['@jupyterlab/ui-components']);
  if (pkgMessages.length > 0) {
    let pkgName = '@jupyterlab/ui-components';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }
  pkgMessages = await ensureUiComponentsPure(
    pkgPaths['@jupyterlab/ui-components-pure']
  );
  if (pkgMessages.length > 0) {
    let pkgName = '@jupyterlab/ui-components-pure';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }

  // Handle the top level package.
  let corePath = path.resolve('.', 'package.json');
  let coreData: any = utils.readJSONFile(corePath);
  if (utils.writePackageData(corePath, coreData)) {
    messages['top'] = ['Update package.json'];
  }

  // Handle the JupyterLab application top package.
  pkgMessages = ensureJupyterlab();
  if (pkgMessages.length > 0) {
    messages['@application/top'] = pkgMessages;
  }

  // Handle any messages.
  if (Object.keys(messages).length > 0) {
    console.log(JSON.stringify(messages, null, 2));
    if (process.argv.indexOf('--force') !== -1) {
      console.log(
        '\n\nPlease run `jlpm run integrity` locally and commit the changes'
      );
      process.exit(1);
    }
    utils.run('jlpm install');
    console.log('\n\nMade integrity changes!');
    console.log('Please commit the changes by running:');
    console.log('git commit -a -m "Package integrity updates"');
    return false;
  }

  console.log('Repo integrity verified!');
  return true;
}

if (require.main === module) {
  void ensureIntegrity();
}
