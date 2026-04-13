import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeDiscoveryCommand(): Command {
  const cmd = new Command('discovery').description('Search and discover content');

  cmd
    .command('search')
    .description('Search for posts or users')
    .requiredOption('--query <text>', 'search query')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & { query: string; cursor?: string; limit?: number }
      >();
      try {
        const client = createClient(opts);
        const result = await client.discovery.search({
          query: opts.query,
          cursor: opts.cursor,
          limit: opts.limit,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('suggested')
    .description('View suggested users')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.discovery.suggested({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
