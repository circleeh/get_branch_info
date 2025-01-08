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
    '@semantic-release/github',
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    [
      '@semantic-release/git',
      {
        "assets": ["CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
};

export const jsonConfig = {
  analyzeCommits: [
    {
      path: "@semantic-release/commit-analyzer",
      preset: "conventionalcommits",
      presetConfig: true
    }
  ],
  branches: [
    "main",
    "1.x",
    "2.X",
    {
      name: "alpha",
      prerelease: true
    },
    {
      name: "beta",
      prerelease: true
    }
  ],
  generateNotes: [
    {
      path: "@semantic-release/release-notes-generator",
      preset: "conventionalcommits",
      presetConfig: true
    }
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": [
          "CHANGELOG.md"
        ],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
};
