import { asPostId, asUsername, type HeyLolClient, type UserId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

async function resolveUserId(client: HeyLolClient, username: string): Promise<UserId> {
  const profile = await client.profile.get(asUsername(username));
  return profile.id;
}

export function makePayCommand(): Command {
  const cmd = new Command('pay').description('Payments and unlocks');

  cmd
    .command('tip')
    .description('Send a hey (tip) payment to a user')
    .requiredOption('--to <username>', 'recipient username')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { to: string }>();
      try {
        const client = createClient(opts);
        const userId = await resolveUserId(client, opts.to);
        const result = await client.payments.hey({ toUserId: userId });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unlock')
    .description('Unlock a paywalled post')
    .argument('<post-id>', 'post ID to unlock')
    .action(async function (this: Command, postId: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const result = await client.posts.unlockPaywall(asPostId(postId));
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
