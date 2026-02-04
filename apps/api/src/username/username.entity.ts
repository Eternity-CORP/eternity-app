/**
 * Username interface
 * Represents a username record in the database
 */
export interface Username {
  id: string;
  username: string;
  address: string;
  signature: string | null;
  createdAt: Date;
  updatedAt: Date;
}
