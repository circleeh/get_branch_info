import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

export async function run(): Promise<void> {
  try {
    let branchCondition: string;

    // Try both .releaserc.yaml and .releaserc.json
    const configPaths = [
      path.join(process.cwd(), '.releaserc.yaml'),
      path.join(process.cwd(), '.releaserc.yml'),
      path.join(process.cwd(), '.releaserc.json')
    ];

    // Try to read config files
    let config: { branches?: (string | { name: string; prerelease?: boolean })[] } | null = null;

    for (const configPath of configPaths) {
      try {
        const fileContents = await fs.readFile(configPath, 'utf8');
        config = configPath.endsWith('.json')
          ? JSON.parse(fileContents)
          : yaml.load(fileContents) as typeof config;
        break;
      } catch (error) {
        // Continue to next config file
        continue;
      }
    }

    if (config?.branches && config.branches.length > 0) {
      // Filter out prerelease branches as they're handled differently
      const releaseBranches = config.branches
        .filter(branch => {
          if (typeof branch === 'string') return true;
          return !branch.prerelease;
        })
        .map(branch => typeof branch === 'string' ? branch : branch.name)
        .filter(Boolean);

      // If no release branches found, use semantic-release defaults
      if (releaseBranches.length === 0) {
        releaseBranches.push('master', 'main');
      }

      const branchConditions = releaseBranches
        .map(branch => `github.ref == 'refs/heads/${branch}'`);

      // Add maintenance branch patterns if they exist
      const maintenancePatterns = config.branches
        .filter(branch => typeof branch === 'string' && (
          branch.includes('.x') || branch.includes('.X')
        ));

      if (maintenancePatterns.length > 0) {
        core.info(`Found maintenance branch patterns: ${maintenancePatterns.join(', ')}`);
      }

      branchCondition = branchConditions.join(' || ');
    } else {
      // If no config found, use default branch
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        core.setFailed('GITHUB_TOKEN is required');
        return;
      }

      const octokit = github.getOctokit(token);
      const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') ?? [];

      const { data: repository } = await octokit.rest.repos.get({
        owner,
        repo,
      });

      branchCondition = `github.ref == 'refs/heads/${repository.default_branch}'`;
    }

    core.setOutput('is-release-branch', branchCondition);
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
