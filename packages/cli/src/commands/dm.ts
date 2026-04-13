import { asUsername, type HeyLolClient, type UserId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

async function resolveUserId(client: HeyLolClient, username: string): Promise<UserId> {
  const profile = await client.profile.get(asUsername(username));
  return profile.id;
}

export function makeDMCommand(): Command {
  const cmd = new Command('dm').description('Direct messages');

  cmd
    .command('send')
    .description('Send a direct message')
    .requiredOption('--to <username>', 'recipient username')
    .requiredOption('--content <text>', 'message content')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { to: string; content: string }>();
      try {
        const client = createClient(opts);
        const userId = await resolveUserId(client, opts.to);
        const result = await client.dm.send({ to: userId, content: opts.content });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('list')
    .description('List recent conversations')
    .option('--cursor <string>', 'pagination cursor')
    .option('--limit <number>', 'number of conversations to return', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.dm.conversations({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('read')
    .description('Read messages from a user')
    .argument('<username>', 'username of the conversation partner')
    .option('--limit <number>', 'number of messages to return', parseInt, 20)
    .action(async function (this: Command, username: string) {
      const opts = this.optsWithGlobals<GlobalContext & { limit: number }>();
      try {
        const client = createClient(opts);
        const userId = await resolveUserId(client, username);
        const convos = await client.dm.conversations({ limit: 50 });
        const convo = convos.conversations.find(
          (c) => c.other_participant.username === username || c.other_participant.user_id === userId,
        );
        if (!convo) {
          printSuccess({ messages: [], next_cursor: null }, opts);
          return;
        }
        const messages = await client.dm.messages(convo.id, { limit: opts.limit });
        printSuccess(messages, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
