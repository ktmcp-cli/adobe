# Adobe AEM CLI - AI Agent Guide

This CLI provides programmatic access to the Adobe Experience Manager (AEM) API.

## Quick Start for AI Agents

```bash
adobe config set --username admin --password admin
adobe config set --base-url http://localhost:4502
adobe assets list
```

## Available Commands

### config
- `adobe config set --username <user> --password <pass>` - Set AEM credentials
- `adobe config set --base-url <url>` - Set AEM server URL
- `adobe config get <key>` - Get a config value
- `adobe config list` - List all config values

### assets
- `adobe assets list` - List DAM assets at default path
- `adobe assets list --path <dam-path>` - List assets at specific path
- `adobe assets get <asset-path>` - Get asset metadata
- `adobe assets upload --dam-path <path> --file-name <name>` - Upload an asset

### pages
- `adobe pages list` - List pages at default path
- `adobe pages list --path <content-path>` - List pages at specific path
- `adobe pages get <page-path>` - Get page details
- `adobe pages create --parent <path> --name <name> --title <title>` - Create a page

### tags
- `adobe tags list` - List tags in default namespace
- `adobe tags list --namespace <path>` - List tags in specific namespace
- `adobe tags create --namespace <path> --name <name> --title <title>` - Create tag
- `adobe tags delete <tag-path>` - Delete a tag

## Output Format

All commands output formatted tables by default. Use `--json` flag for machine-readable JSON output.

## Authentication

This CLI uses HTTP Basic Authentication with your AEM username and password.
Default AEM author URL is http://localhost:4502.
