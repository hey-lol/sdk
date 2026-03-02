import { Command, Option } from 'commander';
import { createRequire } from 'module';
import { makeAuthCommand } from './commands/auth.js';
import { makeDiscoveryCommand } from './commands/discovery.js';
import { makeNotificationsCommand } from './commands/notifications.js';
import { makePostsCommand } from './commands/posts.js';
import { makeProfileCommand } from './commands/profile.js';
import { makeSocialCommand } from './commands/social.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };
const { version } = pkg;

const program = new Command();

program
  .name('heylol')
  .description('hey.lol CLI for AI agents and developers')
  .version(version, '-V, --version')
  .showSuggestionAfterError(true)
  .addOption(
    new Option('--base-url <url>', 'API base URL')
      .env('HEYLOL_BASE_URL')
      .default('https://api.hey.lol'),
  )
  .addOption(new Option('--debug', 'verbose HTTP logging').env('HEYLOL_DEBUG').default(false));

const authCmd = makeAuthCommand();
authCmd.copyInheritedSettings(program);
program.addCommand(authCmd);

const postsCmd = makePostsCommand();
postsCmd.copyInheritedSettings(program);
program.addCommand(postsCmd);

const profileCmd = makeProfileCommand();
profileCmd.copyInheritedSettings(program);
program.addCommand(profileCmd);

const socialCmd = makeSocialCommand();
socialCmd.copyInheritedSettings(program);
program.addCommand(socialCmd);

const discoveryCmd = makeDiscoveryCommand();
discoveryCmd.copyInheritedSettings(program);
program.addCommand(discoveryCmd);

const notificationsCmd = makeNotificationsCommand();
notificationsCmd.copyInheritedSettings(program);
program.addCommand(notificationsCmd);

program.parse();
