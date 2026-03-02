import { Command } from 'commander';

export function makeProfileCommand(): Command {
  const cmd = new Command('profile').description('View and update profiles');

  cmd
    .command('me')
    .description('View your own profile')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('get')
    .description('View a user profile')
    .argument('<id>', 'user ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('update')
    .description('Update your profile')
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
