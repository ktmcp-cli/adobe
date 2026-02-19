import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setConfig, isConfigured, getAllConfig } from './config.js';
import {
  listAssets, getAsset, uploadAsset,
  listPages, getPage, createPage,
  listTags, createTag, deleteTag
} from './api.js';

const program = new Command();

// ============================================================
// Helpers
// ============================================================

function printSuccess(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function printError(message) {
  console.error(chalk.red('✗') + ' ' + message);
}

function printTable(data, columns) {
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }
  const widths = {};
  columns.forEach(col => {
    widths[col.key] = col.label.length;
    data.forEach(row => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      if (val.length > widths[col.key]) widths[col.key] = val.length;
    });
    widths[col.key] = Math.min(widths[col.key], 50);
  });
  const header = columns.map(col => col.label.padEnd(widths[col.key])).join('  ');
  console.log(chalk.bold(chalk.cyan(header)));
  console.log(chalk.dim('─'.repeat(header.length)));
  data.forEach(row => {
    const line = columns.map(col => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      return val.substring(0, widths[col.key]).padEnd(widths[col.key]);
    }).join('  ');
    console.log(line);
  });
  console.log(chalk.dim(`\n${data.length} result(s)`));
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function withSpinner(message, fn) {
  const spinner = ora(message).start();
  try {
    const result = await fn();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function requireAuth() {
  if (!isConfigured()) {
    printError('AEM credentials not configured.');
    console.log('\nRun the following to configure:');
    console.log(chalk.cyan('  adobe config set --username admin --password admin'));
    console.log(chalk.cyan('  adobe config set --base-url http://localhost:4502'));
    process.exit(1);
  }
}

// ============================================================
// Program metadata
// ============================================================

program
  .name('adobe')
  .description(chalk.bold('Adobe AEM CLI') + ' - Experience Manager from your terminal')
  .version('1.0.0');

// ============================================================
// CONFIG
// ============================================================

const configCmd = program.command('config').description('Manage CLI configuration');

configCmd
  .command('set')
  .description('Set configuration values')
  .option('--username <user>', 'AEM username')
  .option('--password <pass>', 'AEM password')
  .option('--base-url <url>', 'AEM base URL (default: http://localhost:4502)')
  .action((options) => {
    if (options.username) { setConfig('username', options.username); printSuccess('Username set'); }
    if (options.password) { setConfig('password', options.password); printSuccess('Password set'); }
    if (options.baseUrl) { setConfig('baseUrl', options.baseUrl); printSuccess(`Base URL set to: ${options.baseUrl}`); }
    if (!options.username && !options.password && !options.baseUrl) {
      printError('No options provided. Use --username, --password, or --base-url');
    }
  });

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action((key) => {
    const value = getConfig(key);
    if (value === undefined) {
      printError(`Key "${key}" not found`);
    } else {
      console.log(key === 'password' ? '****' : value);
    }
  });

configCmd
  .command('list')
  .description('List all configuration values')
  .action(() => {
    const all = getAllConfig();
    console.log(chalk.bold('\nAdobe AEM CLI Configuration\n'));
    console.log('Username: ', all.username ? chalk.green(all.username) : chalk.red('not set'));
    console.log('Password: ', all.password ? chalk.green('****') : chalk.red('not set'));
    console.log('Base URL: ', all.baseUrl ? chalk.green(all.baseUrl) : chalk.yellow('using default: http://localhost:4502'));
    console.log('');
  });

// ============================================================
// ASSETS
// ============================================================

const assetsCmd = program.command('assets').description('Manage DAM assets');

assetsCmd
  .command('list')
  .description('List assets in DAM')
  .option('--path <path>', 'DAM path to list', '/content/dam')
  .option('--limit <n>', 'Maximum number of results', '20')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const assets = await withSpinner('Fetching assets...', () =>
        listAssets(options.path, { limit: parseInt(options.limit) })
      );
      if (options.json) { printJson(assets); return; }
      printTable(assets, [
        { key: 'name', label: 'Name' },
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
        { key: 'mimeType', label: 'MIME Type' },
        { key: 'path', label: 'Path' }
      ]);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

assetsCmd
  .command('get <asset-path>')
  .description('Get details of a specific asset')
  .option('--json', 'Output as JSON')
  .action(async (assetPath, options) => {
    requireAuth();
    try {
      const asset = await withSpinner('Fetching asset...', () => getAsset(assetPath));
      if (options.json) { printJson(asset); return; }
      console.log(chalk.bold('\nAsset Details\n'));
      console.log('Path:     ', chalk.cyan(assetPath));
      const content = asset['jcr:content'];
      console.log('Title:    ', content?.['jcr:title'] || 'N/A');
      console.log('MIME Type:', content?.['jcr:mimeType'] || 'N/A');
      console.log('Type:     ', asset['jcr:primaryType'] || 'N/A');
      console.log('Modified: ', content?.['jcr:lastModified'] || 'N/A');
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

assetsCmd
  .command('upload')
  .description('Upload an asset to DAM')
  .requiredOption('--dam-path <path>', 'Target DAM folder path (e.g. /content/dam/my-folder)')
  .requiredOption('--file-name <name>', 'File name for the asset')
  .option('--mime-type <type>', 'MIME type of the file', 'application/octet-stream')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const result = await withSpinner('Uploading asset...', () =>
        uploadAsset(options.damPath, options.fileName, `placeholder-content-${Date.now()}`, options.mimeType)
      );
      if (options.json) { printJson(result); return; }
      printSuccess(`Asset uploaded: ${chalk.bold(options.fileName)} to ${options.damPath}`);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// PAGES
// ============================================================

const pagesCmd = program.command('pages').description('Manage AEM pages');

pagesCmd
  .command('list')
  .description('List pages under a path')
  .option('--path <path>', 'Content path to list', '/content')
  .option('--limit <n>', 'Maximum number of results', '20')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const pages = await withSpinner('Fetching pages...', () =>
        listPages(options.path, { limit: parseInt(options.limit) })
      );
      if (options.json) { printJson(pages); return; }
      printTable(pages, [
        { key: 'name', label: 'Name' },
        { key: 'title', label: 'Title' },
        { key: 'template', label: 'Template' },
        { key: 'path', label: 'Path' }
      ]);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

pagesCmd
  .command('get <page-path>')
  .description('Get details of a specific page')
  .option('--json', 'Output as JSON')
  .action(async (pagePath, options) => {
    requireAuth();
    try {
      const page = await withSpinner('Fetching page...', () => getPage(pagePath));
      if (options.json) { printJson(page); return; }
      console.log(chalk.bold('\nPage Details\n'));
      console.log('Path:     ', chalk.cyan(pagePath));
      const content = page['jcr:content'];
      console.log('Title:    ', content?.['jcr:title'] || 'N/A');
      console.log('Template: ', content?.['cq:template'] || 'N/A');
      console.log('Modified: ', content?.['cq:lastModified'] || 'N/A');
      console.log('Type:     ', page['jcr:primaryType'] || 'N/A');
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

pagesCmd
  .command('create')
  .description('Create a new AEM page')
  .requiredOption('--parent <path>', 'Parent page path (e.g. /content/my-site)')
  .requiredOption('--name <name>', 'Page node name (URL-friendly)')
  .requiredOption('--title <title>', 'Page title')
  .option('--template <template>', 'Page template path', '/libs/wcm/foundation/templates/page')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const page = await withSpinner('Creating page...', () =>
        createPage(options.parent, options.name, options.title, options.template)
      );
      if (options.json) { printJson(page); return; }
      printSuccess(`Page created: ${chalk.bold(options.title)}`);
      console.log('Path:     ', `${options.parent}/${options.name}`);
      console.log('Template: ', options.template);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// TAGS
// ============================================================

const tagsCmd = program.command('tags').description('Manage AEM tags');

tagsCmd
  .command('list')
  .description('List tags in a namespace')
  .option('--namespace <path>', 'Tag namespace path', '/content/cq:tags')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const tags = await withSpinner('Fetching tags...', () => listTags(options.namespace));
      if (options.json) { printJson(tags); return; }
      printTable(tags, [
        { key: 'name', label: 'Name' },
        { key: 'title', label: 'Title' },
        { key: 'count', label: 'Usage Count' },
        { key: 'path', label: 'Path' }
      ]);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

tagsCmd
  .command('create')
  .description('Create a new tag')
  .requiredOption('--namespace <path>', 'Tag namespace path (e.g. /content/cq:tags/my-namespace)')
  .requiredOption('--name <name>', 'Tag node name')
  .requiredOption('--title <title>', 'Tag display title')
  .option('--description <desc>', 'Tag description')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const tag = await withSpinner('Creating tag...', () =>
        createTag(options.namespace, options.name, options.title, options.description)
      );
      if (options.json) { printJson(tag); return; }
      printSuccess(`Tag created: ${chalk.bold(options.title)}`);
      console.log('Path: ', tag.path);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

tagsCmd
  .command('delete <tag-path>')
  .description('Delete a tag by its full path')
  .action(async (tagPath) => {
    requireAuth();
    try {
      await withSpinner('Deleting tag...', () => deleteTag(tagPath));
      printSuccess('Tag deleted successfully');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// Parse
// ============================================================

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
