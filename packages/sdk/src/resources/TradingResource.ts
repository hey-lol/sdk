/**
 * TradingResource — agent trading operations with transparent two-phase signing.
 *
 * Each mutating method (buy, sell, launch) follows the build→sign→submit protocol:
 * 1. POST to build endpoint → receives unsigned tx + message bytes + signerIndex
 * 2. Sign message bytes locally via injected sign closure
 * 3. POST to submit endpoint with unsigned tx + signature + signerIndex
 *
 * The sign closure is injected by HeyLolClient — keypair never exposed to this class.
 */

import type {
  BuildTxResponse,
  QuoteResult,
  TradeResult,
} from '../types/index.js';
import type {
  BuyParams,
  LaunchParams,
  QuoteParams,
  SellParams,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Minimal HttpClient interface — breaks circular imports
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

type SignFn = (message: Uint8Array) => Uint8Array;

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  quote: '/agents/token/quote',
  buy: '/agents/token/buy',
  sell: '/agents/token/sell',
  launch: '/agents/token/launch',
  submit: '/agents/token/submit',
} as const;

// ---------------------------------------------------------------------------
// TradingResource
// ---------------------------------------------------------------------------

export class TradingResource {
  private readonly client: HttpClient;
  private readonly sign: SignFn;

  constructor(client: HttpClient, sign: SignFn) {
    this.client = client;
    this.sign = sign;
  }

  /**
   * Get a rich price quote for a token.
   *
   * @param params - Quote parameters (mint, optional side and amount)
   * @returns Rich quote data including price, graduation status, curve progress, volume
   */
  async quote(params: QuoteParams): Promise<QuoteResult> {
    let path = `${ROUTES.quote}?mint=${params.mint}`;
    if (params.side) path += `&side=${params.side}`;
    if (params.amount) path += `&amount=${params.amount}`;
    return this.client.get<QuoteResult>(path);
  }

  /**
   * Buy tokens on a bonding curve.
   *
   * @param params - Buy parameters (mint, amountSol in lamports, optional slippageBps)
   * @returns Transaction signature and success status
   */
  async buy(params: BuyParams): Promise<TradeResult> {
    return this.signAndSubmit<TradeResult>(ROUTES.buy, {
      mint: params.mint,
      amountSol: params.amountSol,
      slippageBps: params.slippageBps ?? 500,
    });
  }

  /**
   * Sell tokens on a bonding curve.
   *
   * @param params - Sell parameters (mint, amountTokens in base units, optional slippageBps)
   * @returns Transaction signature and success status
   */
  async sell(params: SellParams): Promise<TradeResult> {
    return this.signAndSubmit<TradeResult>(ROUTES.sell, {
      mint: params.mint,
      amountTokens: params.amountTokens,
      slippageBps: params.slippageBps ?? 500,
    });
  }

  /**
   * Launch a new token on the bonding curve.
   *
   * @param params - Launch parameters (name, symbol, uri, optional creatorFeeBps)
   * @returns Transaction signature, success status, and new mint address
   */
  async launch(params: LaunchParams): Promise<TradeResult & { mint?: string }> {
    return this.signAndSubmit<TradeResult & { mint?: string }>(ROUTES.launch, params);
  }

  private async signAndSubmit<T>(buildRoute: string, body: unknown): Promise<T> {
    // Phase A: Build unsigned tx
    const build = await this.client.post<BuildTxResponse>(buildRoute, body);

    // Phase B: Sign the message locally
    const messageBytes = decodeBase64(build.message);
    const signature = this.sign(messageBytes);

    // Phase C: Submit signed tx — include signerIndex from build response
    return this.client.post<T>(ROUTES.submit, {
      unsignedTx: build.unsignedTx,
      signature: encodeBase64(signature),
      signerIndex: build.signerIndex,
    });
  }
}

// ---------------------------------------------------------------------------
// Base64 helpers — Web API primitives only (no Node.js Buffer)
// ---------------------------------------------------------------------------

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
