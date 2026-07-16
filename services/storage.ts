import { BookRecord } from '../types';
import { loadCredentials } from './auth';
import { loadBookFromGist, loadBooksFromGist, loadBooksMetadataFromGist, saveBooksToGist } from './gist';

/**
 * Initialize storage (no-op for gist-based storage)
 */
export async function initStorage(): Promise<void> {
  // No initialization needed for gist-based storage
  return Promise.resolve();
}

// Every gist write is a read-modify-write of the whole library, so concurrent
// writers would clobber each other. All mutations run through this queue.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  // Keep the chain alive after a rejection so one failure cannot stall the queue.
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Clean up book data by removing null/undefined chapters
 */
function cleanBookData(book: BookRecord): BookRecord {
  // Filter out null/undefined chapters
  const validChapters = book.chapters.filter(ch => ch !== null && ch !== undefined);

  // If chapters were filtered, we need to remap summaries and images
  if (validChapters.length !== book.chapters.length) {
    console.warn(`Book ${book.id} had ${book.chapters.length - validChapters.length} null chapters, cleaning up`);

    // Create a mapping from old indices to new indices
    const indexMap = new Map<number, number>();
    let newIdx = 0;
    book.chapters.forEach((ch, oldIdx) => {
      if (ch !== null && ch !== undefined) {
        indexMap.set(oldIdx, newIdx);
        newIdx++;
      }
    });

    // Remap summaries and images
    const newSummaries: Record<number, any> = {};
    const newImages: Record<number, any> = {};

    Object.entries(book.summaries).forEach(([oldIdx, summary]) => {
      const newIndex = indexMap.get(parseInt(oldIdx));
      if (newIndex !== undefined) {
        newSummaries[newIndex] = summary;
      }
    });

    Object.entries(book.images).forEach(([oldIdx, image]) => {
      const newIndex = indexMap.get(parseInt(oldIdx));
      if (newIndex !== undefined) {
        newImages[newIndex] = image;
      }
    });

    return {
      ...book,
      chapters: validChapters,
      summaries: newSummaries,
      images: newImages,
    };
  }

  return book;
}

/**
 * Get all books metadata (fast, without loading chapters)
 */
export async function getAllBooksMetadata(): Promise<BookRecord[]> {
  const credentials = loadCredentials();
  if (!credentials?.githubPAT) {
    throw new Error('GitHub PAT not found');
  }

  try {
    const books = await loadBooksMetadataFromGist(credentials.githubPAT);
    return books;
  } catch (error) {
    console.error('Error loading books metadata:', error);
    throw error;
  }
}

/**
 * Get all books from GitHub Gist (full data with chapters)
 */
export async function getAllBooks(): Promise<BookRecord[]> {
  const credentials = loadCredentials();
  if (!credentials?.githubPAT) {
    throw new Error('GitHub PAT not found');
  }

  try {
    const books = await loadBooksFromGist(credentials.githubPAT);
    // Clean up any books with null chapters
    return books.map(cleanBookData);
  } catch (error) {
    console.error('Error loading books:', error);
    throw error;
  }
}

/**
 * Get a single book by ID
 */
export async function getBook(id: number): Promise<BookRecord | null> {
  const credentials = loadCredentials();
  if (!credentials?.githubPAT) {
    throw new Error('GitHub PAT not found');
  }

  const book = await loadBookFromGist(credentials.githubPAT, id);
  return book ? cleanBookData(book) : null;
}

/**
 * Add a new book
 */
export async function addBook(book: Omit<BookRecord, 'id'>): Promise<number> {
  return enqueue(async () => {
    const credentials = loadCredentials();
    if (!credentials?.githubPAT) {
      throw new Error('GitHub PAT not found');
    }

    const books = await getAllBooks();

    const maxId = books.reduce((max, b) => Math.max(max, b.id || 0), 0);
    const newId = maxId + 1;

    const newBook: BookRecord = { ...book, id: newId };
    await saveBooksToGist(credentials.githubPAT, [newBook, ...books]);

    return newId;
  });
}

/**
 * Update an existing book
 */
export async function updateBook(book: BookRecord): Promise<void> {
  return enqueue(async () => {
    const credentials = loadCredentials();
    if (!credentials?.githubPAT) {
      throw new Error('GitHub PAT not found');
    }

    const books = await getAllBooks();
    const exists = books.some(b => b.id === book.id);
    const updatedBooks = exists
      ? books.map(b => (b.id === book.id ? book : b))
      : [book, ...books];

    await saveBooksToGist(credentials.githubPAT, updatedBooks);
  });
}

/**
 * Clear all books (history)
 */
export async function clearHistory(): Promise<void> {
  return enqueue(async () => {
    const credentials = loadCredentials();
    if (!credentials?.githubPAT) {
      throw new Error('GitHub PAT not found');
    }

    await saveBooksToGist(credentials.githubPAT, []);
  });
}
