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

    for (const configFile of possibleConfigs) {
      const configPath = path.join(process.cwd(), configFile);

      try {
        let config;
        if (configFile.endsWith('.js') || configFile.endsWith('.cjs')) {
          // Handle JavaScript config files
          config = require(configPath);
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
            const plugins = config.plugins.map((plugin: string | [string, object]) => {
              if (typeof plugin === 'string') {
                return plugin;
              }
              // If it's an array, take the first element which is the plugin name
              return Array.isArray(plugin) ? plugin[0] : '';
            }).filter(Boolean);

            const pluginsList = plugins.join(' ');
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

// Only run if this is the main module
if (require.main === module) {
  run();
}
