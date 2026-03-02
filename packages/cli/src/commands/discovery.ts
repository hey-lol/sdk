import { Command } from 'commander';

export function makeDiscoveryCommand(): Command {
  const cmd = new Command('discovery').description('Search and discover content');

  cmd
    .command('search')
    .description('Search for posts or users')
    .requiredOption('--query <text>', 'search query')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('trending')
    .description('View trending content')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('suggested')
    .description('View suggested users')
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
