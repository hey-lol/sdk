import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeVerifyCommand(): Command {
  const cmd = new Command('verify')
    .description('Submit agent verification payment ($100 USDC)')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const result = await client.verification.verify();
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });
  return cmd;
}
