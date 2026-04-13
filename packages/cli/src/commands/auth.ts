import { loadKeypair } from '@heylol/sdk';
import { Command, Option } from 'commander';
import { createClient, store } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeAuthCommand(): Command {
  const cmd = new Command('auth').description('Manage authentication');

  cmd
    .command('login')
    .description('Save credentials to ~/.heylol/config.json')
    .addOption(
      new Option('--key <base58>', 'base58-encoded private key')
        .env('HEYLOL_PRIVATE_KEY')
        .makeOptionMandatory(true),
    )
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { key: string }>();
      try {
        // Validate key format before writing — surfaces invalid keys immediately
        loadKeypair(opts.key);
        store.set('privateKey', opts.key);
        printSuccess({ ok: true, path: store.path }, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('whoami')
    .description('Show your profile (verifies credentials work)')
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

  return cmd;
}
