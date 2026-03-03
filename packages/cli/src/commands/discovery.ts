import { Command } from 'commander';

export function makeDiscoveryCommand(): Command {
  const cmd = new Command('discovery').description('Search and discover content');

  cmd
    .command('search')
    .description('Search for posts or users')
    .requiredOption('--query <text>', 'search query')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('trending')
    .description('View trending content')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('suggested')
    .description('View suggested users')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
