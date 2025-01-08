import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { yamlConfig, jsonConfig } from './test-configs';
import { mockCore, mockOctokit, mockReadFile, mockGetOctokit, setupMocks } from './setup';

describe('Branch Condition Action', () => {
  beforeEach(() => {
    // Clear module cache first
    jest.resetModules();

    // Setup all mocks
    setupMocks();

    // Reset process.env
    process.env = {
      ...process.env,
      GITHUB_TOKEN: 'mock-token',
      GITHUB_REPOSITORY: 'owner/repo',
    };
  });

  test('uses default branch when no config file exists', async () => {
    // Mock fs.readFile to simulate no config files
    mockReadFile.mockRejectedValue(new Error('File not found'));

    // Mock GitHub API response
    mockOctokit.rest.repos.get.mockResolvedValueOnce({
      data: { default_branch: 'main' },
    });

    // Import and run the action
    const indexModule = await import('../src/index');
    await indexModule.run();

    // Verify GitHub API was called correctly
    expect(mockGetOctokit).toHaveBeenCalledWith('mock-token');
    expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
    });

    // Verify the output
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'is-release-branch',
      "github.ref == 'refs/heads/main'",
    );
  });

  test('uses branches from .releaserc.yaml', async () => {
    // Mock fs.readFile to return the actual YAML config
    mockReadFile.mockResolvedValue(yaml.dump(yamlConfig));

    // Import and run the action
    const indexModule = await import('../src/index');
    await indexModule.run();

    // Verify maintenance branch patterns were detected
    expect(mockCore.info).toHaveBeenCalledWith('Found maintenance branch patterns: 1.x, 2.X');

    // Verify the output - main branch and maintenance branches, but not prerelease branches
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'is-release-branch',
      "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/1.x' || github.ref == 'refs/heads/2.X'",
    );
  });

  test('uses branches from .releaserc.json', async () => {
    // Mock fs.readFile to return the actual JSON config
    mockReadFile.mockResolvedValue(JSON.stringify(jsonConfig));

    // Import and run the action
    const indexModule = await import('../src/index');
    await indexModule.run();

    // Verify maintenance branch patterns were detected
    expect(mockCore.info).toHaveBeenCalledWith('Found maintenance branch patterns: 1.x, 2.X');

    // Verify the output - main branch and maintenance branches, but not prerelease branches
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'is-release-branch',
      "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/1.x' || github.ref == 'refs/heads/2.X'",
    );
  });

  test('handles maintenance branches', async () => {
    // Mock config file content with maintenance branches
    const mockConfig = {
      branches: ['main', '1.x', '2.X'],
    };

    // Mock fs.readFile to return the config
    mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

    // Import and run the action
    const indexModule = await import('../src/index');
    await indexModule.run();

    // Verify maintenance branch patterns were detected
    expect(mockCore.info).toHaveBeenCalledWith('Found maintenance branch patterns: 1.x, 2.X');

    // Verify the output
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'is-release-branch',
      "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/1.x' || github.ref == 'refs/heads/2.X'",
    );
  });

  test('handles missing GITHUB_TOKEN', async () => {
    // Remove GITHUB_TOKEN from environment
    process.env = {
      ...process.env,
      GITHUB_TOKEN: undefined,
      GITHUB_REPOSITORY: 'owner/repo',
    };

    // Mock fs.readFile to simulate no config files
    mockReadFile.mockRejectedValue(new Error('File not found'));

    // Import and run the action
    const indexModule = await import('../src/index');
    await indexModule.run();

    // Verify error handling
    expect(mockCore.setFailed).toHaveBeenCalledWith('GITHUB_TOKEN is required');
  });
});
