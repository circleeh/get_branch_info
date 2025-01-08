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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const yaml = __importStar(require("js-yaml"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
async function run() {
    var _a, _b;
    try {
        let branchCondition;
        // Try both .releaserc.yaml and .releaserc.json
        const configPaths = [
            path_1.default.join(process.cwd(), '.releaserc.yaml'),
            path_1.default.join(process.cwd(), '.releaserc.yml'),
            path_1.default.join(process.cwd(), '.releaserc.json')
        ];
        // Try to read config files
        let config = null;
        for (const configPath of configPaths) {
            try {
                const fileContents = await fs_1.promises.readFile(configPath, 'utf8');
                config = configPath.endsWith('.json')
                    ? JSON.parse(fileContents)
                    : yaml.load(fileContents);
                break;
            }
            catch (error) {
                // Continue to next config file
                continue;
            }
        }
        if ((config === null || config === void 0 ? void 0 : config.branches) && config.branches.length > 0) {
            // Filter out prerelease branches as they're handled differently
            const releaseBranches = config.branches
                .filter(branch => {
                if (typeof branch === 'string')
                    return true;
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
                .filter(branch => typeof branch === 'string' && (branch.includes('.x') || branch.includes('.X')));
            if (maintenancePatterns.length > 0) {
                core.info(`Found maintenance branch patterns: ${maintenancePatterns.join(', ')}`);
            }
            branchCondition = branchConditions.join(' || ');
        }
        else {
            // If no config found, use default branch
            const token = process.env.GITHUB_TOKEN;
            if (!token) {
                core.setFailed('GITHUB_TOKEN is required');
                return;
            }
            const octokit = github.getOctokit(token);
            const [owner, repo] = (_b = (_a = process.env.GITHUB_REPOSITORY) === null || _a === void 0 ? void 0 : _a.split('/')) !== null && _b !== void 0 ? _b : [];
            const { data: repository } = await octokit.rest.repos.get({
                owner,
                repo,
            });
            branchCondition = `github.ref == 'refs/heads/${repository.default_branch}'`;
        }
        core.setOutput('is-release-branch', branchCondition);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('An unexpected error occurred');
        }
    }
}
// Only run if this is the main module
if (require.main === module) {
    run();
}
