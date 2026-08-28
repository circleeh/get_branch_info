import * as core from '@actions/core';
import * as github from '@actions/github';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { run } from '../src/main';

// Exercises config loading against real files on disk (not mocked fs/require), unlike
// __tests__/index.test.ts which mocks `fs` globally and only ever serves JSON content.
//
// The JS/CJS cases are NOT a regression test for the ncc/webpack bundling bug fixed
// alongside them - this runs src/main.ts directly through ts-jest with no bundler
// involved, so they'd pass even without that fix. See __tests__/dist-bundle.test.ts for
// the test that actually proves the bundled artifact works.
//
// The YAML case has no analogous bundler-specific risk to guard against (fs.readFile
// and yaml.load are both statically-imported, ordinary calls - there's nothing dynamic
// for ncc/webpack to mishandle), so source-level coverage here is sufficient; it was
// also manually verified against the real compiled dist/index.js and doesn't need a
// dist-bundle.test.ts counterpart.
describe('Config loading (source-level, real filesystem)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'get-branch-info-src-'));
    jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    github.context.ref = 'refs/heads/main';
    github.context.sha = '';
    github.context.payload = {};
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('loads branches/tagFormat/plugins from a real .releaserc.js file', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.releaserc.js'),
      "module.exports = {\n" +
      "  branches: ['main'],\n" +
      "  tagFormat: 'custom-${version}-tag',\n" +
      "  plugins: ['@semantic-release/commit-analyzer']\n" +
      "};\n"
    );

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('is-release-branch', true);
    expect(core.setOutput).toHaveBeenCalledWith('tagFormat-prefix', 'custom-');
    expect(core.setOutput).toHaveBeenCalledWith('tagFormat-suffix', '-tag');
  });

  test('loads branches from a real .releaserc.cjs file', async () => {
    await fs.writeFile(path.join(tmpDir, '.releaserc.cjs'), "module.exports = { branches: ['main'] };\n");

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('is-release-branch', true);
  });

  test('loads branches/tagFormat/plugins from a real .releaserc.yaml file', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.releaserc.yaml'),
      "branches:\n" +
      "  - main\n" +
      "  - 1.x\n" +
      "tagFormat: \"custom-${version}-tag\"\n" +
      "plugins:\n" +
      "  - \"@semantic-release/commit-analyzer\"\n" +
      "  - \"@semantic-release/github\"\n"
    );

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('is-release-branch', true);
    expect(core.setOutput).toHaveBeenCalledWith('tagFormat-prefix', 'custom-');
    expect(core.setOutput).toHaveBeenCalledWith('tagFormat-suffix', '-tag');
    expect(core.setOutput).toHaveBeenCalledWith(
      'semantic-release-plugins',
      '@semantic-release/commit-analyzer @semantic-release/github'
    );
  });
});
