// This file is temporarily disabled due to missing @coral-xyz/anchor dependency
// Solana functionality will be re-enabled when needed

export function createAnchorProvider(connection: any, wallet: any) {
  console.warn('Anchor provider is disabled - missing @coral-xyz/anchor dependency')
  return null
}

export function createProgramFromIdl(provider: any, idl: any, programId: any) {
  console.warn('Program creation is disabled - missing @coral-xyz/anchor dependency')
  return null
}
