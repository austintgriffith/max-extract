// Character and pilot types

export interface Character {
  firstname: string;
  lastname: string;
  ship: number; // Ship number 1-12
  fuel: number;
  cargo: number;
  aggression: number;
  intelligence: number;
  dexterity: number;
  credits: number; // Credits amount (10k-100k)
  privateKey: `0x${string}`;
  publicAddress: `0x${string}`;
}

