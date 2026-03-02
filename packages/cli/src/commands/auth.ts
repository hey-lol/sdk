import { Command } from 'commander';

export function makeAuthCommand(): Command {
  const cmd = new Command('auth').description('Manage authentication');

  cmd
    .command('setup')
    .description('Save credentials to config file')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('verify')
    .description('Verify current credentials')
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
