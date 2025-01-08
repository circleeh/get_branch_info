import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import { yamlConfig } from './test-configs';

// Mock dependencies
jest.mock('@actions/core');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  },
  constants: {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 0o170000,
    S_IFREG: 0o100000,
    S_IFDIR: 0o040000,
    S_IFCHR: 0o020000,
    S_IFBLK: 0o060000,
    S_IFIFO: 0o010000,
    S_IFLNK: 0o120000,
    S_IFSOCK: 0o140000
  }
}));
jest.mock('path', () => ({
  join: (...paths: string[]) => paths.join('/')
}));

describe('Branch Detection Action', () => {
  // Get mocked functions
  const mockSetOutput = jest.spyOn(core, 'setOutput');
  const mockReadFile = jest.spyOn(require('fs').promises, 'readFile');

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset GitHub context
    github.context.ref = '';
    github.context.payload = {};
  });

  describe('direct push cases', () => {
    test('identifies main branch as release branch', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
      const { run } = require('../src/index');
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', true);
    });

    test('identifies feature branch as non-release branch', async () => {
      // Setup
      github.context.ref = 'refs/heads/feature/123';
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
      const { run } = require('../src/index');
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
    });

    test('identifies maintenance branch as release branch', async () => {
      // Setup
      github.context.ref = 'refs/heads/1.x';
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
      const { run } = require('../src/index');
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', true);
    });
  });

  describe('pull request cases', () => {
    test('checks PR source branch', async () => {
      // Setup
      github.context.payload = {
        pull_request: {
          number: 123,
          head: { ref: 'feature/123' },
          html_url: 'https://github.com/owner/repo/pull/123',
          body: 'PR description'
        }
      };
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
      const { run } = require('../src/index');
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
    });
  });

  describe('error cases', () => {
    test('returns false when no config file found', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Execute
      const { run } = require('../src/index');
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
    });

    test('returns false when config has no branches', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(yaml.dump({ plugins: [] }));

      // Execute
      const { run } = require('../src/index');
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
    });
  });
});
