import { spawnSync } from 'child_process';
import { promises as fsPromises, existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(15_000);

const DIST_ENTRY = path.join(__dirname, '..', 'dist', 'index.js');

function parseGithubOutput(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(/^([^=<]+)<<(.+)$/);
    if (match) {
      const [, key, delimiter] = match;
      const valueLines: string[] = [];
      i++;
      while (i < lines.length && lines[i] !== delimiter) {
        valueLines.push(lines[i]);
        i++;
      }
      result[key] = valueLines.join('\n');
    }
    i++;
  }
  return result;
}

// This suite executes the actual committed dist/index.js as a child process, the same
// way GitHub Actions does. Unlike every other test in this project (which runs
// src/main.ts through ts-jest), this is the only test that can catch bugs introduced
// by ncc/webpack bundling itself, e.g. bundler-specific static analysis silently
// rewriting a dynamic require() into an always-throwing stub. Coverage tools will not
// attribute any src/main.ts lines to this file since it runs an uninstrumented,
// separate process - that's expected, not a gap.
function buildChildEnv(overrides: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // Strip inherited GITHUB_* vars: this file itself typically runs inside a real GitHub
  // Actions job, which already has its own GITHUB_EVENT_PATH/GITHUB_REF/etc. set for
  // the outer job. Without stripping them, @actions/github would parse the outer job's
  // real event payload instead of the synthetic scenario below.
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GITHUB_'))
  );
  return { ...base, ...overrides };
}

describe('committed dist/index.js (executed exactly as GitHub Actions runs it)', () => {
  let tmpDir: string;
  let outputFile: string;

  beforeAll(() => {
    if (!existsSync(DIST_ENTRY)) {
      throw new Error(`${DIST_ENTRY} does not exist. Run \`npm run build\` first.`);
    }
  });

  beforeEach(async () => {
    tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'get-branch-info-dist-'));
    outputFile = path.join(tmpDir, 'github_output');
    // core.setOutput's issueFileCommand throws if this file doesn't already exist.
    await fsPromises.writeFile(outputFile, '');
  });

  afterEach(async () => {
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  });

  test.each(['.releaserc.js', '.releaserc.cjs'])(
    'loads a real %s config and reports the branch correctly',
    async (configFile) => {
      await fsPromises.writeFile(
        path.join(tmpDir, configFile),
        "module.exports = {\n" +
        "  branches: ['main', '1.x'],\n" +
        "  tagFormat: 'custom-${version}-tag',\n" +
        "  plugins: ['@semantic-release/commit-analyzer', '@semantic-release/github']\n" +
        "};\n"
      );

      const result = spawnSync(process.execPath, [DIST_ENTRY], {
        cwd: tmpDir,
        env: buildChildEnv({
          GITHUB_REF: 'refs/heads/main',
          GITHUB_SHA: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          GITHUB_OUTPUT: outputFile
        }),
        encoding: 'utf8',
        timeout: 10_000
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);

      const outputs = parseGithubOutput(await fsPromises.readFile(outputFile, 'utf8'));

      // tagFormat-prefix/suffix and semantic-release-plugins are only ever set inside
      // the `if (config)` block right after a successful load - if require(configPath)
      // throws (the bug), the loop swallows it and falls through to only setting
      // is-release-branch=false outside the loop. So these being present and correct,
      // not just is-release-branch being true, is the sharpest signal that real config
      // content was actually parsed rather than silently skipped.
      expect(outputs['is-release-branch']).toBe('true');
      expect(outputs['tagFormat-prefix']).toBe('custom-');
      expect(outputs['tagFormat-suffix']).toBe('-tag');
      expect(outputs['semantic-release-plugins']).toBe(
        '@semantic-release/commit-analyzer @semantic-release/github'
      );
    }
  );
});
