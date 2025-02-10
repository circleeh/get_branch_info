# Get Release Branch Info

A GitHub Action that determines if the current branch is configured as a release
branch in semantic-release configuration.

- [Features](#features)
- [Usage](#usage)
- [Outputs](#outputs)
- [Configuration](#configuration)
- [Examples](#examples)
  - [Basic Usage with Default Branch](#basic-usage-with-default-branch)
  - [Pull Request Workflow](#pull-request-workflow)
- [Requirements](#requirements)

## Features

- Reads branch configuration from semantic-release config files (`.releaserc.*`,
  `release.config.*`)
- Supports multiple config formats (YAML, JSON, JavaScript)
- Handles both direct pushes and pull requests
- Returns a boolean indicating if the current branch is a release branch

## Usage

Add this action to your workflow:

```yaml
- name: Get Branch Info
  uses: circleeh/get_branch_info@v1
  id: branch-info
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Use Branch Info
  if: ${{ steps.branch-info.outputs.is-release-branch == 'true' }}
  run: echo "This is running on a release branch"
```

## Outputs

| Output              | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `is-release-branch` | Boolean indicating if current branch is a release branch      |
| `tagFormat-prefix`  | The prefix of the tag format (everything before `${version}`) |
| `tagFormat-suffix`  | The suffix of the tag format (everything after `${version}`)  |

For example, with `tagFormat: "release-${version}-stable"`:

- `tagFormat-prefix` will be `"release-"`
- `tagFormat-suffix` will be `"-stable"`

If no tagFormat is specified in the config, the default is `"v${version}"`:

- `tagFormat-prefix` will be `"v"`
- `tagFormat-suffix` will be `""`

## Configuration

The action reads branch configuration from your semantic-release config file.
The following config file formats are supported:

- `.releaserc`
- `.releaserc.json`
- `.releaserc.yaml`
- `.releaserc.yml`
- `.releaserc.js`
- `.releaserc.cjs`
- `release.config.js`
- `release.config.cjs`

Example `.releaserc.yaml`:

```yaml
branches:
  - main
  - name: beta
    prerelease: true
  - "1.x"
  - "2.x"
```

The action will consider a branch to be a release branch if it matches any of
the configured branch names. Branch configurations can be either:

- Simple strings (e.g., `"main"`, `"1.x"`)
- Objects with a `name` property (e.g., `{ name: "beta", prerelease: true }`)

## Examples

### Basic Usage with Default Branch

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Release Branch
        uses: circleeh/get_branch_info@v1
        id: branch-info
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Release
        if: ${{ steps.branch-info.outputs.is-release-branch == 'true' }}
        run: npx semantic-release
```

### Pull Request Workflow

```yaml
name: PR Check

on:
  pull_request:
    branches:
      - main
      - "*.x"

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check Release Branch
        uses: circleeh/get_branch_info@v1
        id: branch-info
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: PR to Release Branch
        if: ${{ steps.branch-info.outputs.is-release-branch == 'true' }}
        run: echo "PR targets a release branch"
```

## Requirements

- `GITHUB_TOKEN` environment variable must be provided
- Repository must be checked out first using `actions/checkout`
