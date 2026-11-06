import type { Combat } from "../types";

const DATABASE_NAME = "kiza-counter-cache";
const DATABASE_VERSION = 1;
const COMBATS_STORE = "combats";
const METADATA_STORE = "metadata";

export interface CombatSyncMetadata {
  key: "sync";
  lastFullSyncAt: string;
  lastIncrementalSyncAt: string;
  cursorCreatedAt: string;
  cursorId: string;
}

export interface CombatCacheSnapshot {
  combats: Combat[];
  metadata: CombatSyncMetadata;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB n'est pas disponible."));
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(COMBATS_STORE)) {
        database.createObjectStore(COMBATS_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Ouverture du cache impossible."));
    request.onblocked = () =>
      reject(new Error("Ouverture du cache bloquée par un autre onglet."));
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Lecture du cache impossible."));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Écriture du cache impossible."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Transaction du cache annulée."));
  });
}

export function sortCombats(combats: Combat[]): Combat[] {
  return [...combats].sort((a, b) => {
    const dateOrder = (b.created_at ?? "").localeCompare(a.created_at ?? "");
    return dateOrder || (b.id ?? "").localeCompare(a.id ?? "");
  });
}

export async function getCombatCacheSnapshot(): Promise<CombatCacheSnapshot | null> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [COMBATS_STORE, METADATA_STORE],
    "readonly"
  );
  const completed = transactionResult(transaction);

  const combatsRequest = requestResult(
    transaction.objectStore(COMBATS_STORE).getAll() as IDBRequest<Combat[]>
  );
  const metadataRequest = requestResult(
    transaction
      .objectStore(METADATA_STORE)
      .get("sync") as IDBRequest<CombatSyncMetadata | undefined>
  );

  const [combats, metadata] = await Promise.all([
    combatsRequest,
    metadataRequest,
  ]);
  await completed;

  if (!metadata) return null;

  return { combats: sortCombats(combats), metadata };
}

export async function replaceCombatCache(
  combats: Combat[],
  metadata: CombatSyncMetadata
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [COMBATS_STORE, METADATA_STORE],
    "readwrite"
  );
  const completed = transactionResult(transaction);
  const combatStore = transaction.objectStore(COMBATS_STORE);

  combatStore.clear();
  for (const combat of combats) {
    if (combat.id) combatStore.put(combat);
  }

  transaction.objectStore(METADATA_STORE).put(metadata);
  await completed;
}

export async function upsertCachedCombats(combats: Combat[]): Promise<void> {
  const identifiedCombats = combats.filter(
    (combat): combat is Combat & { id: string } => Boolean(combat.id)
  );
  if (!identifiedCombats.length) return;

  const database = await openDatabase();
  const transaction = database.transaction(COMBATS_STORE, "readwrite");
  const completed = transactionResult(transaction);
  const store = transaction.objectStore(COMBATS_STORE);

  for (const combat of identifiedCombats) {
    store.put(combat);
  }

  await completed;
}

export async function removeCachedCombat(combatId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(COMBATS_STORE, "readwrite");
  const completed = transactionResult(transaction);

  transaction.objectStore(COMBATS_STORE).delete(combatId);
  await completed;
}
