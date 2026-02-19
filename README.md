> "Six months ago, everyone was talking about MCPs. And I was like, screw MCPs. Every MCP would be better as a CLI."
>
> — [Peter Steinberger](https://twitter.com/steipete), Founder of OpenClaw
> [Watch on YouTube (~2:39:00)](https://www.youtube.com/@lexfridman) | [Lex Fridman Podcast #491](https://lexfridman.com/peter-steinberger/)

# Adobe AEM CLI

Production-ready CLI for Adobe Experience Manager (AEM) API.

## Installation

```bash
npm install -g @ktmcp-cli/adobe
```

## Configuration

```bash
adobe config set --username admin --password admin
adobe config set --base-url http://localhost:4502
```

## Usage

### Assets (DAM)

```bash
# List assets in DAM
adobe assets list
adobe assets list --path /content/dam/my-project --limit 50

# Get asset details
adobe assets get /content/dam/my-project/image.jpg

# Upload an asset
adobe assets upload --dam-path /content/dam/my-folder --file-name photo.jpg --mime-type image/jpeg
```

### Pages

```bash
# List pages
adobe pages list
adobe pages list --path /content/my-site

# Get page details
adobe pages get /content/my-site/en/home

# Create a new page
adobe pages create --parent /content/my-site/en \
  --name about-us \
  --title "About Us" \
  --template /libs/wcm/foundation/templates/page
```

### Tags

```bash
# List tags
adobe tags list
adobe tags list --namespace /content/cq:tags/my-project

# Create a tag
adobe tags create \
  --namespace /content/cq:tags/my-project \
  --name featured \
  --title "Featured" \
  --description "Featured content tag"

# Delete a tag
adobe tags delete /content/cq:tags/my-project/featured
```

### Configuration

```bash
adobe config set --username admin --password admin
adobe config set --base-url http://localhost:4502
adobe config get username
adobe config list
```

## JSON Output

All commands support `--json` flag for machine-readable output:

```bash
adobe assets list --json
adobe pages list --json
```

## License

MIT
