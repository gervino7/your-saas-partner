export type AccountType = 'staff';

export interface AccountTypeResult {
  type: AccountType;
  clientId: string | null;
}

// Le portail client a été retiré : tout compte authentifié est un compte collaborateur.
export function useAccountType(): AccountTypeResult {
  return { type: 'staff', clientId: null };
}
