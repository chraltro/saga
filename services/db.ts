import { BookRecord } from '../types';

const DB_NAME = 'BookSummaryDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

let db: IDBDatabase;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };
  });
}

export function addBook(book: Omit<BookRecord, 'id'>): Promise<number> {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(book);

    request.onsuccess = () => {
      resolve(request.result as number);
    };
    request.onerror = () => {
      console.error('Error adding book:', request.error);
      reject('Could not add book to the database.');
    };
  });
}

export function updateBook(book: BookRecord): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!book.id) return reject("Book has no ID, cannot update.");
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(book);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      console.error('Error updating book:', request.error);
      reject('Could not update book in the database.');
    };
  });
}

export function getBook(id: number): Promise<BookRecord | undefined> {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      console.error('Error getting book:', request.error);
      reject('Could not retrieve book from the database.');
    };
  });
}

export function getAllBooks(): Promise<BookRecord[]> {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('lastAccessed');
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort descending by lastAccessed
      resolve(request.result.reverse());
    };
    request.onerror = () => {
      console.error('Error getting all books:', request.error);
      reject('Could not retrieve books from the database.');
    };
  });
}

export function clearHistory(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            console.error('Error clearing history:', request.error);
            reject('Could not clear history.');
        };
    });
}
