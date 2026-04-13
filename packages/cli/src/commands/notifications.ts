import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeNotificationsCommand(): Command {
  const cmd = new Command('notifications').description('Manage notifications');

  cmd
    .command('list')
    .description('List your notifications')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.notifications.list({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('mark-read')
    .description('Mark notifications as read')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.notifications.markRead();
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('mark-all-read')
    .description('Mark all notifications as read')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.notifications.markAllRead();
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unread-count')
    .description('Get count of unread notifications')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const result = await client.notifications.unreadCount();
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
