import * as core from '@actions/core';

// Create all mocks first
export const mockCore = {
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn()
};

// Create a proper mock function for fs.promises.readFile
export const mockReadFile = jest.fn();

// Create GitHub API mocks
export const mockGetOctokit = jest.fn();
export const mockOctokit = {
  rest: {
    repos: {
      get: jest.fn()
    }
  }
};

// Set up the getOctokit mock to return mockOctokit
mockGetOctokit.mockImplementation(() => mockOctokit);

// Export the mock implementations for use in beforeEach
export const setupMocks = () => {
  // Clear all mock implementations
  mockCore.setOutput.mockReset();
  mockCore.setFailed.mockReset();
  mockCore.info.mockReset();
  mockReadFile.mockReset();
  mockGetOctokit.mockReset();
  mockOctokit.rest.repos.get.mockReset();

  // Reset getOctokit implementation
  mockGetOctokit.mockImplementation(() => mockOctokit);

  // Setup mocks
  jest.mock('@actions/core', () => mockCore);
  jest.mock('@actions/github', () => ({
    getOctokit: mockGetOctokit
  }));
  jest.mock('fs', () => ({
    promises: {
      readFile: mockReadFile
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
      S_IFSOCK: 0o140000,
    }
  }));
  jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/'))
  }));
  jest.mock('@actions/io/lib/io-util');
};
