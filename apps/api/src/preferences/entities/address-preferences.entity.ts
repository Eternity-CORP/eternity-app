/**
 * AddressPreferences interface
 * Represents address preferences in the database
 */
export interface AddressPreferences {
  address: string;
  defaultNetwork: string | null;
  tokenOverrides: Record<string, string>;
  updatedAt: Date;
}
