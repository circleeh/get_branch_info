# circleeh/get_branch_info

A GitHub Action that helps determine valid release branches based on
semantic-release configuration.

## Features

- Reads branch configuration from `.releaserc.yaml`, `.releaserc.yml`, or
  `.releaserc.json`
- Automatically detects release branches from semantic-release configuration
- Falls back to repository default branch if no configuration is found
- Supports maintenance branch patterns (e.g., `1.x`, `2.X`)
- Returns branch conditions suitable for GitHub Actions workflow conditions

## Usage

Add this action to your workflow:

```yaml
- name: Get Branch Info
  uses: circleeh/get_branch_info@v1
  id: branch-info
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Use Branch Conditions
  if: ${{ steps.branch-info.outputs.is-release-branch }}
  run: echo "This is running on a release branch"
```

## Outputs

| Output     | Description                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `is-release-branch` | A condition string for use in GitHub Actions workflow that matches configured release branches |

## Configuration

The action reads branch configuration from your semantic-release config file.
Example `.releaserc.yaml`:

```yaml
branches:
  - main
  - name: beta
    prerelease: true
  - "1.x"
  - "2.x"
```

If no configuration is found, the action will use the repository's default
branch.

## Examples

### Basic Usage with Default Branch

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get Branch Info
        uses: circleeh/get_branch_info@v1
        id: branch-info
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Release
        if: ${{ steps.branch-info.outputs.is-release-branch }}
        run: npx semantic-release
```

### Using with Multiple Release Branches

```yaml
name: Release

on:
  push:
    branches:
      - main
      - "*.x"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get Branch Info
        uses: circleeh/get_branch_info@v1
        id: branch-info
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Release
        if: ${{ steps.branch-info.outputs.is-release-branch }}
        run: npx semantic-release
```

## Requirements

- `GITHUB_TOKEN` environment variable must be provided
- Repository must be checked out first using `actions/checkout`
