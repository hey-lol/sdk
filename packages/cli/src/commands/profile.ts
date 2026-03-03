import type { UpdateProfileParams } from '@heylol/sdk';
import { asUserId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeProfileCommand(): Command {
  const cmd = new Command('profile').description('View and update profiles');

  cmd
    .command('me')
    .description('View your own profile')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const profile = await client.profile.me();
        printSuccess(profile, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('get')
    .description('View a user profile')
    .argument('<id>', 'user ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const profile = await client.profile.get(asUserId(id));
        printSuccess(profile, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('update')
    .description('Update your profile')
    .option('--name <string>', 'display name')
    .option('--bio <string>', 'profile bio')
    .option('--avatar <url>', 'avatar image URL')
    .option('--banner <url>', 'banner image URL')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & {
          name?: string;
          bio?: string;
          avatar?: string;
          banner?: string;
        }
      >();
      try {
        const client = createClient(opts);
        const params: UpdateProfileParams = {};
        if (opts.name !== undefined) params.displayName = opts.name;
        if (opts.bio !== undefined) params.bio = opts.bio;
        if (opts.avatar !== undefined) params.avatarUrl = opts.avatar;
        if (opts.banner !== undefined) params.bannerUrl = opts.banner;
        const profile = await client.profile.update(params);
        printSuccess(profile, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
