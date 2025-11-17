import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import { yamlConfig } from './test-configs';
import { execSync } from 'child_process';
import { run } from '../src/index';

// Mock dependencies
jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    ref: '',
    payload: {},
  },
}));
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  },
  existsSync: jest.fn(),
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
jest.mock('child_process');

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
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', true);
    });

    test('identifies feature branch as non-release branch', async () => {
      // Setup
      github.context.ref = 'refs/heads/feature/123';
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
    });

    test('identifies maintenance branch as release branch', async () => {
      // Setup
      github.context.ref = 'refs/heads/1.x';
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
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
          base: { ref: 'main' },
          html_url: 'https://github.com/owner/repo/pull/123',
          body: 'PR description'
        }
      };
      mockReadFile.mockResolvedValueOnce(yaml.dump(yamlConfig));

      // Execute
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
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
    });

    test('returns false when config has no branches', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(yaml.dump({ plugins: [] }));

      // Execute
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
      expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-prefix', 'v');
      expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-suffix', '');
    });
  });

  describe('tagFormat extraction', () => {
    describe('direct push cases', () => {
      test('extracts default tagFormat from release branch', async () => {
        // Setup
        github.context.ref = 'refs/heads/main';
        mockReadFile.mockResolvedValueOnce(yaml.dump({
          branches: ['main']
        }));

        // Execute
        await run();

        // Verify
        expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', true);
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-prefix', 'v');
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-suffix', '');
      });

      test('extracts custom tagFormat from non-release branch', async () => {
        // Setup
        github.context.ref = 'refs/heads/feature/123';
        mockReadFile.mockResolvedValueOnce(yaml.dump({
          branches: ['main'],
          tagFormat: 'release-${version}-stable'
        }));

        // Execute
        await run();

        // Verify
        expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-prefix', 'release-');
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-suffix', '-stable');
      });
    });

    describe('pull request cases', () => {
      test('extracts tagFormat from PR targeting release branch', async () => {
        // Setup
        github.context.payload = {
          pull_request: {
            number: 123,
            head: { ref: 'feature/123' },
            base: { ref: 'main' },
            html_url: 'https://github.com/owner/repo/pull/123',
            body: 'PR description'
          }
        };
        mockReadFile.mockResolvedValueOnce(yaml.dump({
          branches: ['main'],
          tagFormat: 'pr-${version}-test'
        }));

        // Execute
        await run();

        // Verify
        expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-prefix', 'pr-');
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-suffix', '-test');
      });

      test('extracts default tagFormat from PR on non-release branch', async () => {
        // Setup
        github.context.payload = {
          pull_request: {
            number: 456,
            head: { ref: 'feature/456' },
            base: { ref: 'develop' },
            html_url: 'https://github.com/owner/repo/pull/456',
            body: 'PR description'
          }
        };
        mockReadFile.mockResolvedValueOnce(yaml.dump({
          branches: ['main']
        }));

        // Execute
        await run();

        // Verify
        expect(mockSetOutput).toHaveBeenCalledWith('is-release-branch', false);
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-prefix', 'v');
        expect(mockSetOutput).toHaveBeenCalledWith('tagFormat-suffix', '');
      });
    });
  });

  describe('plugin extraction', () => {
    test('extracts plugins from config with string entries', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(yaml.dump({
        plugins: [
          '@semantic-release/commit-analyzer',
          '@semantic-release/github'
        ]
      }));

      // Execute
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith(
        'semantic-release-plugins',
        '@semantic-release/commit-analyzer @semantic-release/github'
      );
    });

    test('extracts plugins from config with mixed string and array entries', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(yaml.dump({
        plugins: [
          '@semantic-release/commit-analyzer',
          ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
          '@semantic-release/github'
        ]
      }));

      // Execute
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith(
        'semantic-release-plugins',
        '@semantic-release/commit-analyzer @semantic-release/changelog @semantic-release/github'
      );
    });

    test('handles config without plugins', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(yaml.dump({
        branches: ['main']
      }));

      // Execute
      await run();

      // Verify
      expect(mockSetOutput).not.toHaveBeenCalledWith(
        'semantic-release-plugins',
        expect.any(String)
      );
    });

    test('includes conventional-changelog packages when presets are used', async () => {
      // Setup
      github.context.ref = 'refs/heads/main';
      mockReadFile.mockResolvedValueOnce(JSON.stringify({
        plugins: ['@semantic-release/commit-analyzer'],
        analyzeCommits: [{
          path: '@semantic-release/commit-analyzer',
          preset: 'conventionalcommits'
        }],
        generateNotes: {
          path: '@semantic-release/release-notes-generator',
          preset: 'angular'
        }
      }));

      // Execute
      await run();

      // Verify
      expect(mockSetOutput).toHaveBeenCalledWith(
        'semantic-release-plugins',
        '@semantic-release/commit-analyzer conventional-changelog-conventionalcommits conventional-changelog-angular'
      );
    });
  });

  describe('short SHA functionality', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();

      // Mock execSync to return a fake SHA
      (execSync as jest.Mock).mockReturnValue('abc1234\n');
    });

    it('should get short SHA for PR branch', async () => {
      // Mock PR context
      github.context.payload = {
        pull_request: {
          number: 123,
          head: {
            ref: 'feature-branch'
          },
          html_url: 'https://github.com/owner/repo/pull/123',
          body: 'PR description'
        }
      };

      await run();

      // Verify execSync was called with the correct command
      expect(execSync).toHaveBeenCalledWith(
        'git rev-parse --short "feature-branch"',
        expect.any(Object)
      );

      // Verify the output was set
      expect(core.setOutput).toHaveBeenCalledWith('short-sha', 'abc1234');
    });

    it('should get short SHA for direct push', async () => {
      // Mock direct push context
      github.context.payload = {};
      github.context.ref = 'refs/heads/main';

      await run();

      // Verify execSync was called with the correct command
      expect(execSync).toHaveBeenCalledWith(
        'git rev-parse --short HEAD',
        expect.any(Object)
      );

      // Verify the output was set
      expect(core.setOutput).toHaveBeenCalledWith('short-sha', 'abc1234');
    });

    it('should handle git command failure gracefully', async () => {
      // Mock execSync to throw an error
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('git command failed');
      });

      github.context.payload = {};
      github.context.ref = 'refs/heads/main';

      await run();

      // Verify warning was logged
      expect(core.warning).toHaveBeenCalledWith('Failed to get short SHA');
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('Error getting short SHA'));
    });
  });
});
