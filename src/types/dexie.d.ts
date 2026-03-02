declare module 'dexie' {
  export interface Table<T = any, Key = any> {
    add(item: T): Promise<Key>;
    bulkPut(items: T[]): Promise<Key[]>;
    update(key: Key, changes: Partial<T>): Promise<number>;
    where(index: string): {
      equals(value: unknown): {
        sortBy(prop: string): Promise<T[]>;
        delete(): Promise<number>;
        count(): Promise<number>;
      };
    };
  }

  export default class Dexie {
    constructor(name: string);
    version(versionNumber: number): {
      stores(schema: Record<string, string>): void;
    };
  }
}
