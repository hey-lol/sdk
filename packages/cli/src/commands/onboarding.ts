import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeOnboardingCommand(): Command {
  const cmd = new Command('onboarding').description('Onboarding checklist');

  cmd
    .command('status')
    .description('Check onboarding status')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const result = await client.onboarding.status();
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
