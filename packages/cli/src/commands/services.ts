import type { CreateServiceParams } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printBadArgs, printFailure, printSuccess } from '../output.js';

export function makeServicesCommand(): Command {
  const cmd = new Command('services').description('Manage services');

  cmd
    .command('create')
    .description('Create a new service')
    .requiredOption('--name <string>', 'service name')
    .requiredOption('--endpoint <url>', 'service endpoint URL')
    .requiredOption('--slug <string>', 'unique slug')
    .option('--description <text>', 'service description')
    .option('--price <amount>', 'price in USDC')
    .option('--method <method>', 'HTTP method: GET or POST')
    .option('--category <cat>', 'category: ai, defi, data, content, social, dev, other')
    .option('--input-params <json>', 'JSON array of input parameters')
    .option('--output-params <json>', 'JSON array of output parameters')
    .option('--sample-input <text>', 'sample input')
    .option('--sample-output <text>', 'sample output')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<
        GlobalContext & {
          name: string;
          endpoint: string;
          slug: string;
          description?: string;
          price?: string;
          method?: string;
          category?: string;
          inputParams?: string;
          outputParams?: string;
          sampleInput?: string;
          sampleOutput?: string;
        }
      >();
      try {
        let parsedInputParams: CreateServiceParams['input_params'];
        if (opts.inputParams) {
          try {
            parsedInputParams = JSON.parse(opts.inputParams);
          } catch {
            printBadArgs('--input-params must be valid JSON', opts);
          }
        }

        let parsedOutputParams: CreateServiceParams['output_params'];
        if (opts.outputParams) {
          try {
            parsedOutputParams = JSON.parse(opts.outputParams);
          } catch {
            printBadArgs('--output-params must be valid JSON', opts);
          }
        }

        const params: CreateServiceParams = {
          name: opts.name,
          endpoint_url: opts.endpoint,
          slug: opts.slug,
          description: opts.description,
          price: opts.price,
          method: opts.method as 'GET' | 'POST' | undefined,
          category: opts.category as CreateServiceParams['category'],
          input_params: parsedInputParams,
          output_params: parsedOutputParams,
          sample_input: opts.sampleInput,
          sample_output: opts.sampleOutput,
        };

        const client = createClient(opts);
        const result = await client.services.create(params);
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('list')
    .description('List your services')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const result = await client.services.list();
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('execute')
    .description('Execute a service')
    .argument('<id>', 'service ID')
    .option('--params <json>', 'JSON parameters for the service')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { params?: string }>();
      try {
        let parsedParams: Record<string, unknown> | undefined;
        if (opts.params) {
          try {
            parsedParams = JSON.parse(opts.params);
          } catch {
            printBadArgs('--params must be valid JSON', opts);
          }
        }

        const client = createClient(opts);
        const result = await client.services.execute(
          id,
          parsedParams ? { params: parsedParams } : undefined,
        );
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
