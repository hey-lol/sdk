import { Command } from 'commander';

export function makeNotificationsCommand(): Command {
  const cmd = new Command('notifications').description('Manage notifications');

  cmd
    .command('list')
    .description('List your notifications')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('mark-read')
    .description('Mark notifications as read')
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
