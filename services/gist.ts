import { BookRecord } from '../types';

const GIST_DESCRIPTION = 'SAGA App - Book Library Data';
const GIST_INDEX_FILENAME = 'saga_library_index.json';
const MAX_FILE_SIZE = 800000; // ~800KB per file to stay well under 1MB limit

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
  size?: number;
}

interface Gist {
  id: string;
  description: string;
  files: Record<string, GistFile>;
}

interface CreateGistResponse {
  id: string;
}

/**
 * Find the SAGA gist for this user
 */
async function findSagaGist(githubPAT: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `token ${githubPAT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gists: Gist[] = await response.json();
    const sagaGist = gists.find(g => g.description === GIST_DESCRIPTION);

    return sagaGist?.id || null;
  } catch (error) {
    console.error('Error finding SAGA gist:', error);
    throw error;
  }
}

/**
 * Create a new gist for SAGA data
 */
async function createSagaGist(githubPAT: string, books: BookRecord[]): Promise<string> {
  try {
    const files = splitBooksIntoFiles(books);
    const gistFiles: Record<string, { content: string }> = {};

    console.log(`Creating gist with ${Object.keys(files).length} files:`, Object.keys(files));

    Object.entries(files).forEach(([filename, content]) => {
      gistFiles[filename] = { content };
      console.log(`  ${filename}: ${content.length} bytes`);
    });

    const payload = JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: gistFiles,
    });

    console.log(`Total payload size: ${payload.length} bytes`);

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubPAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gist creation failed:', response.status, errorText);
      throw new Error(`Failed to create gist: ${response.status} - ${errorText}`);
    }

    const gist: CreateGistResponse = await response.json();
    console.log(`Gist created successfully: ${gist.id}`);
    return gist.id;
  } catch (error) {
    console.error('Error creating SAGA gist:', error);
    throw error;
  }
}

/**
 * Update existing gist with new data
 */
async function updateGist(githubPAT: string, gistId: string, books: BookRecord[]): Promise<void> {
  try {
    const files = splitBooksIntoFiles(books);
    const gistFiles: Record<string, { content: string }> = {};

    Object.entries(files).forEach(([filename, content]) => {
      gistFiles[filename] = { content };
    });

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubPAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: gistFiles,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update gist: ${response.status}`);
    }
  } catch (error) {
    console.error('Error updating gist:', error);
    throw error;
  }
}

/**
 * Split books into multiple files with chunking for large books
 */
function splitBooksIntoFiles(books: BookRecord[]): Record<string, string> {
  const files: Record<string, string> = {};

  // Create index with book metadata
  const index = books.map(book => ({
    id: book.id,
    title: book.title,
    chapterCount: book.chapters.length,
    summaries: book.summaries,
    images: book.images,
    lastAccessed: book.lastAccessed,
  }));
  files[GIST_INDEX_FILENAME] = JSON.stringify(index, null, 2);

  // Store each book, splitting if too large
  books.forEach(book => {
    if (!book.id) return;

    const bookData = JSON.stringify(book, null, 2);

    // If book fits in one file, store it normally
    if (bookData.length <= MAX_FILE_SIZE) {
      files[`book_${book.id}.json`] = bookData;
    } else {
      // Split book into chunks
      console.log(`Book ${book.id} is too large (${bookData.length} bytes), splitting into chunks`);

      // Split chapters into groups
      const chunkSize = 10; // chapters per chunk
      const chunks: BookRecord[] = [];

      for (let i = 0; i < book.chapters.length; i += chunkSize) {
        const chunkChapters = book.chapters.slice(i, i + chunkSize);
        const chunkSummaries: Record<number, any> = {};
        const chunkImages: Record<number, any> = {};

        // Map summaries and images to chunk indices
        chunkChapters.forEach((_, localIdx) => {
          const globalIdx = i + localIdx;
          if (book.summaries[globalIdx]) chunkSummaries[localIdx] = book.summaries[globalIdx];
          if (book.images[globalIdx]) chunkImages[localIdx] = book.images[globalIdx];
        });

        chunks.push({
          id: book.id,
          title: book.title,
          chapters: chunkChapters,
          summaries: chunkSummaries,
          images: chunkImages,
          lastAccessed: book.lastAccessed,
        });
      }

      // Store metadata with chunk info
      files[`book_${book.id}_meta.json`] = JSON.stringify({
        id: book.id,
        title: book.title,
        totalChapters: book.chapters.length,
        chunkCount: chunks.length,
        lastAccessed: book.lastAccessed,
      }, null, 2);

      // Store each chunk
      chunks.forEach((chunk, idx) => {
        files[`book_${book.id}_chunk_${idx}.json`] = JSON.stringify(chunk, null, 2);
      });
    }
  });

  return files;
}

/**
 * Helper to get file content from gist (handles raw_url if content not inline)
 */
async function getFileContent(file: GistFile | undefined): Promise<string | null> {
  if (!file) return null;

  // If file is truncated, always fetch from raw_url to get complete content
  if (file.truncated && file.raw_url) {
    try {
      console.log(`Fetching truncated file from raw_url: ${file.raw_url}`);
      const response = await fetch(file.raw_url);
      if (response.ok) {
        const fullContent = await response.text();
        console.log(`Fetched ${fullContent.length} bytes from raw_url`);
        return fullContent;
      } else {
        console.error(`Failed to fetch raw content: ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch raw content:', err);
    }
  }

  // Use inline content if available and not truncated
  if (file.content) return file.content;

  // Fallback to raw_url if content not available
  if (file.raw_url) {
    try {
      const response = await fetch(file.raw_url);
      if (response.ok) {
        return await response.text();
      }
    } catch (err) {
      console.error('Failed to fetch raw content:', err);
    }
  }

  return null;
}

/**
 * Load only book metadata (index) from GitHub Gist without loading full chapters
 */
export async function loadBooksMetadataFromGist(githubPAT: string): Promise<BookRecord[]> {
  try {
    const gistId = await findSagaGist(githubPAT);

    if (!gistId) {
      console.log('No SAGA gist found');
      return [];
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${githubPAT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load gist: ${response.status}`);
    }

    const gist: Gist = await response.json();
    const indexFile = gist.files[GIST_INDEX_FILENAME];
    const indexContent = await getFileContent(indexFile);

    if (indexContent) {
      const index = JSON.parse(indexContent) as Array<{
        id: number;
        title: string;
        chapterCount: number;
        summaries: Record<number, any>;
        images: Record<number, any>;
        lastAccessed: number;
      }>;

      // Return books with minimal data (no chapter content)
      return index.map(entry => ({
        id: entry.id,
        title: entry.title,
        chapters: new Array(entry.chapterCount).fill(null), // Placeholder
        summaries: entry.summaries,
        images: entry.images,
        lastAccessed: entry.lastAccessed,
      }));
    }

    // Fallback: scan for metadata files
    const books: BookRecord[] = [];
    for (const filename of Object.keys(gist.files)) {
      const metaMatch = filename.match(/^book_(\d+)_meta\.json$/);
      if (metaMatch) {
        const bookId = parseInt(metaMatch[1]);
        const metaContent = await getFileContent(gist.files[filename]);
        if (metaContent) {
          const meta = JSON.parse(metaContent) as { id: number; title: string; totalChapters: number; lastAccessed: number };
          books.push({
            id: meta.id,
            title: meta.title,
            chapters: new Array(meta.totalChapters).fill(null), // Placeholder
            summaries: {},
            images: {},
            lastAccessed: meta.lastAccessed,
          });
        }
      }
    }

    return books;
  } catch (error) {
    console.error('Error loading books metadata:', error);
    throw error;
  }
}

/**
 * Load books from GitHub Gist
 */
export async function loadBooksFromGist(githubPAT: string): Promise<BookRecord[]> {
  try {
    const gistId = await findSagaGist(githubPAT);

    if (!gistId) {
      // No gist exists yet, return empty array
      console.log('No SAGA gist found');
      return [];
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${githubPAT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load gist: ${response.status}`);
    }

    const gist: Gist = await response.json();

    console.log('Files in gist:', Object.keys(gist.files));
    console.log('Looking for index file:', GIST_INDEX_FILENAME);

    const indexFile = gist.files[GIST_INDEX_FILENAME];
    const indexContent = await getFileContent(indexFile);

    if (indexContent) {
      // New format: index + individual book files
      console.log('Loading books from new format (index + book files)');
      console.log('Index content:', indexContent);
      const index = JSON.parse(indexContent) as Array<{id: number}>;
      console.log('Parsed index:', index);

      // If index is empty, fall through to reconstruction logic
      if (index.length === 0) {
        console.log('Index is empty, falling through to reconstruction');
      } else {
      const books: BookRecord[] = [];

      // Load each book from its individual file or chunks
      for (const indexEntry of index) {
        const bookId = indexEntry.id;

        // Check if book is chunked
        const metaFilename = `book_${bookId}_meta.json`;
        const metaContent = await getFileContent(gist.files[metaFilename]);

        if (metaContent) {
          // Chunked book
          try {
            const meta = JSON.parse(metaContent) as { id: number; title: string; totalChapters: number; chunkCount: number; lastAccessed: number };

            // Load all chunks
            const allChapters: any[] = [];
            const allSummaries: Record<number, any> = {};
            const allImages: Record<number, any> = {};

            for (let chunkIdx = 0; chunkIdx < meta.chunkCount; chunkIdx++) {
              const chunkFilename = `book_${bookId}_chunk_${chunkIdx}.json`;
              const chunkFile = gist.files[chunkFilename];

              const chunkContent = await getFileContent(chunkFile);
              if (chunkContent) {
                try {
                  const chunk = JSON.parse(chunkContent) as BookRecord;
                  const baseIdx = allChapters.length; // Use current length, not chunkIdx * 10

                  // Append chapters
                  chunk.chapters.forEach((ch) => {
                    allChapters.push(ch);
                  });

                  // Map summaries and images using the base index
                  Object.entries(chunk.summaries).forEach(([localIdx, summary]) => {
                    allSummaries[baseIdx + parseInt(localIdx)] = summary;
                  });

                  Object.entries(chunk.images).forEach(([localIdx, image]) => {
                    allImages[baseIdx + parseInt(localIdx)] = image;
                  });
                } catch (err) {
                  console.error(`Failed to parse chunk ${chunkIdx} for book ${bookId}:`, err);
                  // Continue with other chunks
                }
              }
            }

            books.push({
              id: meta.id,
              title: meta.title,
              chapters: allChapters,
              summaries: allSummaries,
              images: allImages,
              lastAccessed: meta.lastAccessed,
            });

            console.log(`Loaded chunked book ${bookId} from ${meta.chunkCount} chunks`);
          } catch (err) {
            console.error(`Failed to load chunked book ${bookId}:`, err);
          }
        } else {
          console.log(`No metadata found for book ${bookId}, checking for regular file`);
        }

        if (!metaContent) {
          // Regular (non-chunked) book
          const bookFilename = `book_${bookId}.json`;
          const bookContent = await getFileContent(gist.files[bookFilename]);

          if (bookContent) {
            try {
              const book = JSON.parse(bookContent) as BookRecord;
              books.push(book);
              console.log(`Loaded regular book ${bookId}`);
            } catch (err) {
              console.error(`Failed to parse book ${bookId}:`, err);
            }
          }
        }
      }

      console.log(`Returning ${books.length} books from new format`);
      return books;
      }
    }

    // Check for old format (single file - backward compatibility)
    const oldFormatContent = gist.files['saga_library.json']?.content;
    if (oldFormatContent) {
      console.log('Loading books from old format (single file)');
      try {
        const books = JSON.parse(oldFormatContent) as BookRecord[];

        // Migrate to new format on next save
        console.log(`Loaded ${books.length} books from old format`);
        return books;
      } catch (err) {
        console.error('Failed to parse old format:', err);
        return [];
      }
    }

    // Fallback: Check for book files without index (index missing scenario)
    console.log('No index found, checking for individual book files...');
    const books: BookRecord[] = [];
    const processedBookIds = new Set<number>();

    for (const filename of Object.keys(gist.files)) {
      // Handle chunked books
      const chunkMatch = filename.match(/^book_(\d+)_chunk_(\d+)\.json$/);
      if (chunkMatch) {
        const bookId = parseInt(chunkMatch[1]);
        if (!processedBookIds.has(bookId)) {
          processedBookIds.add(bookId);
          // Load metadata
          const metaContent = await getFileContent(gist.files[`book_${bookId}_meta.json`]);
          if (metaContent) {
            try {
              const meta = JSON.parse(metaContent) as { id: number; title: string; totalChapters: number; chunkCount: number; lastAccessed: number };

              // Load all chunks
              const allChapters: any[] = [];
              const allSummaries: Record<number, any> = {};
              const allImages: Record<number, any> = {};

              for (let chunkIdx = 0; chunkIdx < meta.chunkCount; chunkIdx++) {
                const chunkFilename = `book_${bookId}_chunk_${chunkIdx}.json`;
                const chunkFile = gist.files[chunkFilename];
                console.log(`Loading chunk ${chunkIdx}: truncated=${chunkFile?.truncated}, size=${chunkFile?.size}`);

                const chunkContent = await getFileContent(chunkFile);
                if (chunkContent) {
                  try {
                    const chunk = JSON.parse(chunkContent) as BookRecord;
                    const baseIdx = allChapters.length; // Use current length, not chunkIdx * 10

                    // Append chapters
                    chunk.chapters.forEach((ch) => {
                      allChapters.push(ch);
                    });

                    // Map summaries and images using the base index
                    Object.entries(chunk.summaries).forEach(([localIdx, summary]) => {
                      allSummaries[baseIdx + parseInt(localIdx)] = summary;
                    });

                    Object.entries(chunk.images).forEach(([localIdx, image]) => {
                      allImages[baseIdx + parseInt(localIdx)] = image;
                    });
                    console.log(`Successfully loaded chunk ${chunkIdx}`);
                  } catch (err) {
                    console.error(`Failed to parse chunk ${chunkIdx}:`, err);
                    // Continue with other chunks even if one fails
                  }
                } else {
                  console.warn(`No content for chunk ${chunkIdx}`);
                }
              }

              books.push({
                id: meta.id,
                title: meta.title,
                chapters: allChapters,
                summaries: allSummaries,
                images: allImages,
                lastAccessed: meta.lastAccessed,
              });

              console.log(`Reconstructed chunked book ${bookId} from ${meta.chunkCount} chunks`);
            } catch (err) {
              console.error(`Failed to load chunked book ${bookId}:`, err);
            }
          }
        }
        continue;
      }

      // Handle regular (non-chunked) book files
      if (filename.startsWith('book_') && filename.endsWith('.json') && !filename.includes('_meta') && !filename.includes('_chunk_')) {
        const bookContent = await getFileContent(gist.files[filename]);
        if (bookContent) {
          try {
            const book = JSON.parse(bookContent) as BookRecord;
            if (book.id && !processedBookIds.has(book.id)) {
              processedBookIds.add(book.id);
              books.push(book);
              console.log(`Found book from file: ${filename}`);
            }
          } catch (err) {
            console.error(`Failed to parse ${filename}:`, err);
          }
        }
      }
    }

    if (books.length > 0) {
      console.log(`Loaded ${books.length} books from individual files (no index)`);
      return books;
    }

    console.log('No book data found in gist');
    return [];
  } catch (error) {
    console.error('Error loading books from gist:', error);
    throw new Error('Failed to load library from GitHub. Please check your PAT and try again.');
  }
}

/**
 * Save books to GitHub Gist
 */
export async function saveBooksToGist(githubPAT: string, books: BookRecord[]): Promise<void> {
  try {
    const gistId = await findSagaGist(githubPAT);

    if (gistId) {
      await updateGist(githubPAT, gistId, books);
    } else {
      await createSagaGist(githubPAT, books);
    }
  } catch (error) {
    console.error('Error saving books to gist:', error);
    throw new Error('Failed to save library to GitHub. Please check your PAT and try again.');
  }
}

/**
 * Test GitHub PAT validity
 */
export async function testGitHubPAT(githubPAT: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubPAT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
