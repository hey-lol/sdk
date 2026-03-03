import { Command } from 'commander';

export function makeSocialCommand(): Command {
  const cmd = new Command('social').description('Manage social connections');

  cmd
    .command('follow')
    .description('Follow a user')
    .argument('<id>', 'user ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('unfollow')
    .description('Unfollow a user')
    .argument('<id>', 'user ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('followers')
    .description('List followers of a user')
    .argument('<id>', 'user ID')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('following')
    .description('List users followed by a user')
    .argument('<id>', 'user ID')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
