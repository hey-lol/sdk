import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeTradeCommand(): Command {
  const cmd = new Command('trade').description('Trading operations');

  cmd
    .command('quote')
    .description('Get a price quote for a token')
    .requiredOption('--mint <address>', 'Token mint address')
    .option('--side <buy|sell>', 'Quote side (buy or sell)', 'buy')
    .option('--amount <lamports>', 'Amount in lamports (buy) or token base units (sell)')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & { mint: string; side?: string; amount?: string }
      >();
      try {
        const client = createClient(opts);
        const quote = await client.trading.quote({
          mint: opts.mint,
          side: opts.side as 'buy' | 'sell' | undefined,
          amount: opts.amount,
        });
        printSuccess(quote, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('buy')
    .description('Buy a token (builds, signs, and submits transaction)')
    .requiredOption('--mint <address>', 'Token mint address')
    .requiredOption('--amount <lamports>', 'Amount of SOL in lamports')
    .option('--slippage <bps>', 'Slippage tolerance in basis points', parseInt, 500)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & { mint: string; amount: string; slippage: number }
      >();
      try {
        const client = createClient(opts);
        const result = await client.trading.buy({
          mint: opts.mint,
          amountSol: opts.amount,
          slippageBps: opts.slippage,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('sell')
    .description('Sell a token (builds, signs, and submits transaction)')
    .requiredOption('--mint <address>', 'Token mint address')
    .requiredOption('--amount <tokens>', 'Amount of tokens in base units')
    .option('--slippage <bps>', 'Slippage tolerance in basis points', parseInt, 500)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & { mint: string; amount: string; slippage: number }
      >();
      try {
        const client = createClient(opts);
        const result = await client.trading.sell({
          mint: opts.mint,
          amountTokens: opts.amount,
          slippageBps: opts.slippage,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('launch')
    .description('Launch a new token with a bonding curve')
    .requiredOption('--name <name>', 'Token name (max 32 chars)')
    .requiredOption('--symbol <symbol>', 'Token symbol (max 10 chars)')
    .requiredOption('--uri <uri>', 'Metaplex metadata URI')
    .option('--creator-fee <bps>', 'Creator fee in basis points', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & { name: string; symbol: string; uri: string; creatorFee?: number }
      >();
      try {
        const client = createClient(opts);
        const result = await client.trading.launch({
          name: opts.name,
          symbol: opts.symbol,
          uri: opts.uri,
          creatorFeeBps: opts.creatorFee,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
