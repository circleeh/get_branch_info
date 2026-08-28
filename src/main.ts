import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

export async function run(): Promise<void> {
  try {
    // More explicitly handle PR vs direct push cases
    const currentBranch = github.context.payload.pull_request
      ? github.context.payload.pull_request.head.ref  // PR case (equivalent to GITHUB_HEAD_REF)
      : github.context.ref.replace('refs/heads/', ''); // Direct push case (equivalent to GITHUB_REF)

    // Get the short SHA from GitHub context (more reliable than git commands)
    // github.context.sha contains the commit SHA that triggered the workflow
    const shortSha = github.context.sha.substring(0, 7);
    core.setOutput('short-sha', shortSha);
    core.debug(`Short SHA: ${shortSha}`);

    core.debug(`GitHub Ref: ${github.context.ref}`);
    core.debug(`Pull Request Head Ref: ${github.context.payload.pull_request?.head.ref}`);
    core.debug(`Current branch: ${currentBranch}`);

    // Check all possible .releaserc config files
    const possibleConfigs = [
      '.releaserc',
      '.releaserc.json',
      '.releaserc.yaml',
      '.releaserc.yml',
      '.releaserc.js',
      '.releaserc.cjs',
      'release.config.js',
      'release.config.cjs'
    ];

    // Safe: the argument is the fixed string literal 'require', never user/repo input,
    // so this evaluates no dynamic or untrusted code - it only retrieves Node's own
    // ambient `require` function reference.
    //
    // eval('require'), not a bare `require(...)` or `createRequire(...)` call: once
    // tsconfig emits ESM (needed for @octokit type resolution), ncc/webpack statically
    // detects both of those patterns and neutralizes them at build time - a plain
    // `require(<dynamic path>)` becomes an always-throwing empty "require context"
    // module (it can't resolve a consumer repo's config path at this action's own
    // build time), and `createRequire(...)` gets its entire call expression replaced
    // with `undefined` regardless of the argument passed. A `require` obtained via
    // `eval` is invisible to both of these static rewrites - bundlers can't inspect a
    // string literal's contents - and Node's CJS loader still injects a real `require`
    // into scope at runtime since dist/index.js has no "type": "module". Do not
    // replace this with a plain `require()` or `createRequire()` call.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
    const dynamicRequire = eval('require') as NodeRequire;

    for (const configFile of possibleConfigs) {
      const configPath = path.join(process.cwd(), configFile);

      try {
        let config;
        if (configFile.endsWith('.js') || configFile.endsWith('.cjs')) {
          // Handle JavaScript config files
          config = dynamicRequire(configPath);
        } else {
          // Handle JSON and YAML config files
          const fileContents = await fs.readFile(configPath, 'utf8');
          config = configFile.endsWith('.json') ? JSON.parse(fileContents) : yaml.load(fileContents);
        }

        if (config) {
          // Handle tagFormat extraction
          let tagFormat = config.tagFormat || 'v${version}';
          const versionPlaceholder = '${version}';

          const tagFormatParts = tagFormat.split(versionPlaceholder);
          const tagFormatPrefix = tagFormatParts[0] || '';
          const tagFormatSuffix = tagFormatParts[1] || '';

          core.setOutput('tagFormat-prefix', tagFormatPrefix);
          core.setOutput('tagFormat-suffix', tagFormatSuffix);
          core.debug(`Tag format prefix: ${tagFormatPrefix}`);
          core.debug(`Tag format suffix: ${tagFormatSuffix}`);

          // Extract and process plugins
          if (config.plugins) {
            const isLocalPath = (pluginName: string): boolean =>
              pluginName.startsWith('./') || pluginName.startsWith('../') || pluginName.startsWith('/');

            const plugins = config.plugins.map((plugin: string | [string, object]) => {
              if (typeof plugin === 'string') {
                return plugin;
              }
              // If it's an array, take the first element which is the plugin name
              return Array.isArray(plugin) ? plugin[0] : '';
            }).filter(Boolean).filter((plugin: string) => !isLocalPath(plugin));

            // Check for preset in analyzeCommits and generateNotes
            let additionalPackages: string[] = [];
            interface PresetConfig {
              preset?: string;
              path?: string;
            }
            const checkPreset = (section: PresetConfig) => {
              if (section?.preset) {
                additionalPackages.push(`conventional-changelog-${section.preset}`);
              }
            };

            if (config.analyzeCommits) {
              const commitAnalyzers = Array.isArray(config.analyzeCommits)
                ? config.analyzeCommits
                : [config.analyzeCommits];
              commitAnalyzers.forEach((analyzer: PresetConfig) => checkPreset(analyzer));
            }

            if (config.generateNotes) {
              const noteGenerators = Array.isArray(config.generateNotes)
                ? config.generateNotes
                : [config.generateNotes];
              noteGenerators.forEach((generator: PresetConfig) => checkPreset(generator));
            }

            const allPackages = [...new Set([...plugins, ...additionalPackages])];
            const pluginsList = allPackages.join(' ');
            core.setOutput('semantic-release-plugins', pluginsList);
            core.debug(`Semantic Release Plugins: ${pluginsList}`);
          }

          // Handle release branches check
          if (config.branches) {
            const releaseBranches = config.branches
              .filter(Boolean)
              .map((branch: string | { name: string }) => typeof branch === 'string' ? branch : branch.name)
              .filter(Boolean);

            const isReleaseBranch = releaseBranches.includes(currentBranch);
            core.setOutput('is-release-branch', isReleaseBranch);
            core.debug(`Is release branch: ${isReleaseBranch}`);
          } else {
            core.setOutput('is-release-branch', false);
          }

          return; // Exit after finding and processing the first config file
        }
      } catch (error) {
        // Continue to next config file if this one doesn't exist or can't be read
        continue;
      }
    }

    // If no valid config was found
    core.setOutput('is-release-branch', false);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}
