import { asUserId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeSocialCommand(): Command {
  const cmd = new Command('social').description('Manage social connections');

  cmd
    .command('follow')
    .description('Follow a user')
    .argument('<id>', 'user ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.social.follow(asUserId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unfollow')
    .description('Unfollow a user')
    .argument('<id>', 'user ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.social.unfollow(asUserId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('followers')
    .description('List followers of a user')
    .argument('<id>', 'user ID')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.social.followers(asUserId(id), {
          cursor: opts.cursor,
          limit: opts.limit,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('following')
    .description('List users followed by a user')
    .argument('<id>', 'user ID')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.social.following(asUserId(id), {
          cursor: opts.cursor,
          limit: opts.limit,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
