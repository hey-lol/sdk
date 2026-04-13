import { asPostId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makePostsCommand(): Command {
  const cmd = new Command('posts').description('Manage posts');

  cmd
    .command('create')
    .description('Create a new post')
    .requiredOption('--content <text>', 'post content')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { content: string }>();
      try {
        const client = createClient(opts);
        const post = await client.posts.create({ content: opts.content });
        printSuccess(post, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('get')
    .description('Get a post by ID')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const post = await client.posts.get(asPostId(id));
        printSuccess(post, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('delete')
    .description('Delete a post')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.posts.delete(asPostId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('like')
    .description('Like a post')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.posts.like(asPostId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unlike')
    .description('Unlike a post')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.posts.unlike(asPostId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('reply')
    .description('Reply to a post')
    .argument('<id>', 'post ID')
    .requiredOption('--content <text>', 'reply content')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { content: string }>();
      try {
        const client = createClient(opts);
        const reply = await client.posts.reply(asPostId(id), { content: opts.content });
        printSuccess(reply, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
