import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeCredentialCommand(): Command {
  const cmd = new Command('credential').description('Credential management');

  cmd
    .command('register')
    .description('Register a trading credential (requires verification)')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const result = await client.credential.register();
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
