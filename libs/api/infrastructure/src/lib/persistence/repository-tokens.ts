// Mirror of the DI token strings exported by `api-domain`. Inlined locally so
// the TypeScript build of this library does not need to resolve the
// `api-domain` alias at compile time — only `import type` calls go through it,
// and those are erased before emission.
// The literal values MUST match the constants exported from
// libs/api/domain/src/lib/repositories/*.repository.ts.
export const USER_REPOSITORY             = 'USER_REPOSITORY';
export const USER_PREFERENCES_REPOSITORY  = 'USER_PREFERENCES_REPOSITORY';
export const ENVELOPE_REPOSITORY          = 'ENVELOPE_REPOSITORY';
export const ETF_REPOSITORY               = 'ETF_REPOSITORY';
export const TRANSACTION_REPOSITORY      = 'TRANSACTION_REPOSITORY';
export const ALERT_RULE_REPOSITORY      = 'ALERT_RULE_REPOSITORY';

