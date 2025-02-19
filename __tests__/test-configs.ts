export const yamlConfig = {
  branches: [
    'main',
    '1.x',
    '2.X',
    { name: 'alpha', prerelease: true },
    { name: 'beta', prerelease: true }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/github'
  ],
  analyzeCommits: [
    {
      path: '@semantic-release/commit-analyzer',
      preset: 'conventionalcommits'
    }
  ],
  generateNotes: {
    path: '@semantic-release/release-notes-generator',
    preset: 'conventionalcommits'
  }
};
