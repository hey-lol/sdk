import { Command } from 'commander';

export function makePostsCommand(): Command {
  const cmd = new Command('posts').description('Manage posts');

  cmd
    .command('list')
    .description('List posts in your feed')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('create')
    .description('Create a new post')
    .requiredOption('--content <text>', 'post content')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('get')
    .description('Get a post by ID')
    .argument('<id>', 'post ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('delete')
    .description('Delete a post')
    .argument('<id>', 'post ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('like')
    .description('Like a post')
    .argument('<id>', 'post ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('unlike')
    .description('Unlike a post')
    .argument('<id>', 'post ID')
    .action(() => {
      throw new Error('not implemented');
    });

  cmd
    .command('reply')
    .description('Reply to a post')
    .argument('<id>', 'post ID')
    .requiredOption('--content <text>', 'reply content')
    .action(() => {
      throw new Error('not implemented');
    });

  return cmd;
}
