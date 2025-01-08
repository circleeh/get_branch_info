"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = __importStar(require("js-yaml"));
const test_configs_1 = require("./test-configs");
const setup_1 = require("./setup");
describe('Branch Condition Action', () => {
    beforeEach(() => {
        // Clear module cache first
        jest.resetModules();
        // Setup all mocks
        (0, setup_1.setupMocks)();
        // Reset process.env
        process.env = {
            ...process.env,
            GITHUB_TOKEN: 'mock-token',
            GITHUB_REPOSITORY: 'owner/repo'
        };
    });
    test('uses default branch when no config file exists', async () => {
        // Mock fs.readFile to simulate no config files
        setup_1.mockReadFile.mockRejectedValue(new Error('File not found'));
        // Mock GitHub API response
        setup_1.mockOctokit.rest.repos.get.mockResolvedValueOnce({
            data: { default_branch: 'main' }
        });
        // Import and run the action
        const indexModule = await Promise.resolve().then(() => __importStar(require('../src/index')));
        await indexModule.run();
        // Verify GitHub API was called correctly
        expect(setup_1.mockGetOctokit).toHaveBeenCalledWith('mock-token');
        expect(setup_1.mockOctokit.rest.repos.get).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo'
        });
        // Verify the output
        expect(setup_1.mockCore.setOutput).toHaveBeenCalledWith('is-release-branch', "github.ref == 'refs/heads/main'");
    });
    test('uses branches from .releaserc.yaml', async () => {
        // Mock fs.readFile to return the actual YAML config
        setup_1.mockReadFile.mockResolvedValue(yaml.dump(test_configs_1.yamlConfig));
        // Import and run the action
        const indexModule = await Promise.resolve().then(() => __importStar(require('../src/index')));
        await indexModule.run();
        // Verify maintenance branch patterns were detected
        expect(setup_1.mockCore.info).toHaveBeenCalledWith('Found maintenance branch patterns: 1.x, 2.X');
        // Verify the output - main branch and maintenance branches, but not prerelease branches
        expect(setup_1.mockCore.setOutput).toHaveBeenCalledWith('is-release-branch', "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/1.x' || github.ref == 'refs/heads/2.X'");
    });
    test('uses branches from .releaserc.json', async () => {
        // Mock fs.readFile to return the actual JSON config
        setup_1.mockReadFile.mockResolvedValue(JSON.stringify(test_configs_1.jsonConfig));
        // Import and run the action
        const indexModule = await Promise.resolve().then(() => __importStar(require('../src/index')));
        await indexModule.run();
        // Verify maintenance branch patterns were detected
        expect(setup_1.mockCore.info).toHaveBeenCalledWith('Found maintenance branch patterns: 1.x, 2.X');
        // Verify the output - main branch and maintenance branches, but not prerelease branches
        expect(setup_1.mockCore.setOutput).toHaveBeenCalledWith('is-release-branch', "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/1.x' || github.ref == 'refs/heads/2.X'");
    });
    test('handles maintenance branches', async () => {
        // Mock config file content with maintenance branches
        const mockConfig = {
            branches: ['main', '1.x', '2.X']
        };
        // Mock fs.readFile to return the config
        setup_1.mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));
        // Import and run the action
        const indexModule = await Promise.resolve().then(() => __importStar(require('../src/index')));
        await indexModule.run();
        // Verify maintenance branch patterns were detected
        expect(setup_1.mockCore.info).toHaveBeenCalledWith('Found maintenance branch patterns: 1.x, 2.X');
        // Verify the output
        expect(setup_1.mockCore.setOutput).toHaveBeenCalledWith('is-release-branch', "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/1.x' || github.ref == 'refs/heads/2.X'");
    });
    test('handles missing GITHUB_TOKEN', async () => {
        // Remove GITHUB_TOKEN from environment
        process.env = {
            ...process.env,
            GITHUB_TOKEN: undefined,
            GITHUB_REPOSITORY: 'owner/repo'
        };
        // Mock fs.readFile to simulate no config files
        setup_1.mockReadFile.mockRejectedValue(new Error('File not found'));
        // Import and run the action
        const indexModule = await Promise.resolve().then(() => __importStar(require('../src/index')));
        await indexModule.run();
        // Verify error handling
        expect(setup_1.mockCore.setFailed).toHaveBeenCalledWith('GITHUB_TOKEN is required');
    });
});
