/**
 * GlobalContext — the shape returned by `optsWithGlobals()` for global options.
 * Every command handler accesses global options via `this.optsWithGlobals<GlobalContext>()`.
 */
export interface GlobalContext {
  baseUrl: string;
  debug: boolean;
}

export type GlobalOpts = GlobalContext;
