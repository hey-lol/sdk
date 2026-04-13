import { asUsername } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeSocialCommand(): Command {
  const cmd = new Command('social').description('Manage social connections');

  cmd
    .command('follow')
    .description('Follow a user')
    .argument('<username>', 'username to follow')
    .action(async function (this: Command, username: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.social.follow(asUsername(username));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unfollow')
    .description('Unfollow a user')
    .argument('<username>', 'username to unfollow')
    .action(async function (this: Command, username: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.social.unfollow(asUsername(username));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('followers')
    .description('List followers of a user')
    .argument('<username>', 'username')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command, username: string) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.social.followers(asUsername(username), {
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
    .argument('<username>', 'username')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command, username: string) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.social.following(asUsername(username), {
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
