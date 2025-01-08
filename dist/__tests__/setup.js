"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMocks = exports.mockOctokit = exports.mockGetOctokit = exports.mockReadFile = exports.mockCore = void 0;
// Create all mocks first
exports.mockCore = {
    setOutput: jest.fn(),
    setFailed: jest.fn(),
    info: jest.fn()
};
// Create a proper mock function for fs.promises.readFile
exports.mockReadFile = jest.fn();
// Create GitHub API mocks
exports.mockGetOctokit = jest.fn();
exports.mockOctokit = {
    rest: {
        repos: {
            get: jest.fn()
        }
    }
};
// Set up the getOctokit mock to return mockOctokit
exports.mockGetOctokit.mockImplementation(() => exports.mockOctokit);
// Export the mock implementations for use in beforeEach
const setupMocks = () => {
    // Clear all mock implementations
    exports.mockCore.setOutput.mockReset();
    exports.mockCore.setFailed.mockReset();
    exports.mockCore.info.mockReset();
    exports.mockReadFile.mockReset();
    exports.mockGetOctokit.mockReset();
    exports.mockOctokit.rest.repos.get.mockReset();
    // Reset getOctokit implementation
    exports.mockGetOctokit.mockImplementation(() => exports.mockOctokit);
    // Setup mocks
    jest.mock('@actions/core', () => exports.mockCore);
    jest.mock('@actions/github', () => ({
        getOctokit: exports.mockGetOctokit
    }));
    jest.mock('fs', () => ({
        promises: {
            readFile: exports.mockReadFile
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
exports.setupMocks = setupMocks;
