import Dexie, { type Table } from "dexie";

export interface LocalCaptura {
  id: string;
  texto: string;
  timestamp: string;
  status: "pending" | "synced" | "offline";
}

export class CapturaDB extends Dexie {
  capturas!: Table<LocalCaptura>;

  constructor() {
    super("CapturaDB");
    this.version(1).stores({
      capturas: "id, timestamp",
    });
  }
}

export const db = new CapturaDB();
