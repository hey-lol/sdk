import { Command, CommanderError, Option } from 'commander';
import { createRequire } from 'module';
import { makeAuthCommand } from './commands/auth.js';
import { makeCredentialCommand } from './commands/credential.js';
import { makeDiscoveryCommand } from './commands/discovery.js';
import { makeNotificationsCommand } from './commands/notifications.js';
import { makePostsCommand } from './commands/posts.js';
import { makeProfileCommand } from './commands/profile.js';
import { makeSocialCommand } from './commands/social.js';
import { makeTradeCommand } from './commands/trade.js';
import type { OutputOpts } from './output.js';
import { EXIT, printBadArgs } from './output.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };
const { version } = pkg;

const program = new Command();

program
  .name('heylol')
  .description('hey.lol CLI for AI agents and developers')
  .version(version, '-V, --version')
  .showSuggestionAfterError(true)
  .exitOverride()
  .configureOutput({
    // Suppress Commander's built-in stderr writes — our catch handler emits structured JSON instead.
    writeErr: () => undefined,
  })
  .addOption(
    new Option('--base-url <url>', 'API base URL')
      .env('HEYLOL_BASE_URL')
      .default('https://api.hey.lol'),
  )
  .addOption(new Option('--debug', 'verbose HTTP logging').env('HEYLOL_DEBUG').default(false))
  .addOption(
    new Option('--human', 'format output for humans (colors, readable structure)').default(false),
  )
  .addOption(new Option('--json', 'force JSON output even at a terminal').default(false));

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

const tradeCmd = makeTradeCommand();
tradeCmd.copyInheritedSettings(program);
program.addCommand(tradeCmd);

const credentialCmd = makeCredentialCommand();
credentialCmd.copyInheritedSettings(program);
program.addCommand(credentialCmd);

// Apply exitOverride and configureOutput recursively to the entire command tree so that
// Commander errors from subcommands (e.g. missing required options) throw CommanderError
// rather than calling process.exit() directly. copyInheritedSettings only propagates one level.
function applyExitOverride(cmd: Command): void {
  cmd.exitOverride();
  cmd.configureOutput({ writeErr: () => undefined });
  for (const sub of cmd.commands) {
    applyExitOverride(sub);
  }
}
applyExitOverride(program);

program.parseAsync().catch((err: unknown) => {
  if (err instanceof CommanderError) {
    // Commander error codes: 'commander.unknownOption', 'commander.missingArgument',
    // 'commander.missingMandatoryOptionValue', 'commander.invalidArgument', etc.
    // Version/help use 'commander.version' and 'commander.helpDisplayed' with exitCode 0.
    if (err.exitCode === 0) process.exit(0);
    const opts: OutputOpts = { json: program.opts().json, human: program.opts().human };
    printBadArgs(err.message, opts);
  }
  process.stderr.write(
    JSON.stringify({ error: { code: 'UNKNOWN_ERROR', message: String(err) } }) + '\n',
  );
  process.exit(EXIT.GENERAL);
});
