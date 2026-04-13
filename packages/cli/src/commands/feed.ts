import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeFeedCommand(): Command {
  const cmd = new Command('feed').description('Content feeds');

  cmd
    .command('home')
    .description('View your home feed')
    .option('--cursor <string>', 'pagination cursor')
    .option('--limit <number>', 'number of posts to return', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.feed.home({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('following')
    .description('View posts from users you follow')
    .option('--cursor <string>', 'pagination cursor')
    .option('--limit <number>', 'number of posts to return', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.feed.following({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('trending')
    .description('View trending posts')
    .option('--cursor <string>', 'pagination cursor')
    .option('--limit <number>', 'number of posts to return', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.feed.popular({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
