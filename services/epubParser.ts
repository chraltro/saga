import { Chapter } from '../types';

declare const ePub: any;

// Helper to extract clean text from an HTML element
function getElementText(element: HTMLElement): string {
  const blockElements = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE']);
  const parts: string[] = [];

  function walkNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      // Collapse whitespace but don't remove it entirely
      const normalized = text.replace(/\s+/g, ' ');
      if (normalized.trim().length > 0) {
        parts.push(normalized);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName;

      // Handle line breaks
      if (tagName === 'BR') {
        parts.push('\n');
        return;
      }

      // Process children
      for (let i = 0; i < element.childNodes.length; i++) {
        walkNode(element.childNodes[i]);
      }

      // Add paragraph break after block elements
      if (blockElements.has(tagName)) {
        parts.push('\n\n');
      }
    }
  }

  walkNode(element);

  // Join all parts
  let text = parts.join('');

  // Clean up the text
  // Replace multiple spaces with single space
  text = text.replace(/ +/g, ' ');

  // Split into lines and trim each
  const lines = text.split('\n').map(line => line.trim());

  // Remove empty lines but preserve paragraph breaks
  const cleanedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0) {
      cleanedLines.push(line);
    } else if (cleanedLines.length > 0 && i < lines.length - 1 && lines[i + 1].length > 0) {
      // Keep one empty line if there's content before and after (paragraph break)
      if (cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
    }
  }

  text = cleanedLines.join('\n');

  // Normalize excessive newlines (3+ becomes 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export async function parseEpub(file: File | ArrayBuffer): Promise<{ title: string; chapters: Chapter[] }> {
  const chapters: Chapter[] = [];

  try {
    const book = ePub(file);
    await book.ready;

    // Extract book title from metadata
    const bookTitle = book.packaging?.metadata?.title || 'Untitled Book';
    console.log('EPUB loaded successfully');
    console.log('Book title:', bookTitle);
    console.log('Spine items:', book.spine.items.length);
    console.log('TOC items:', book.navigation.toc.length);

    const toc = book.navigation.toc;

    for (const item of book.spine.items) {
      if (item.href) {
        try {
          const section = await book.load(item.href);

          // Handle both Document objects and HTML strings
          let doc: Document;
          if (typeof section === 'string') {
            doc = new DOMParser().parseFromString(section, 'text/html');
          } else if (section instanceof Document) {
            doc = section;
          } else {
            // If it's some other format, try to get the documentElement
            doc = section.documentElement ? section : new DOMParser().parseFromString(String(section), 'text/html');
          }

          const content = getElementText(doc.body);

          console.log(`Section ${item.href}: ${content.length} chars, preview: "${content.substring(0, 100)}"`);

          if (content.length > 50) { // Only add sections with meaningful content
            // Try to find a title from the Table of Contents
            const tocItem = toc.find((t: any) => book.path.resolve(t.href) === book.path.resolve(item.href));
            const title = tocItem?.label?.trim().replace(/\s+/g, ' ') || `Chapter ${chapters.length + 1}`;

            chapters.push({ title, content });
          }
        } catch (err) {
          console.warn(`Failed to load section ${item.href}:`, err);
        }
      }
    }

    // A fallback if spine iteration fails to produce chapters
    if (chapters.length === 0 && toc.length > 0) {
        console.warn("Could not parse chapters from EPUB spine, trying TOC directly.");
        for (const tocItem of toc) {
          if(tocItem.href) {
            try {
              const section = await book.load(tocItem.href);

              // Handle both Document objects and HTML strings
              let doc: Document;
              if (typeof section === 'string') {
                doc = new DOMParser().parseFromString(section, 'text/html');
              } else if (section instanceof Document) {
                doc = section;
              } else {
                doc = section.documentElement ? section : new DOMParser().parseFromString(String(section), 'text/html');
              }

              const content = getElementText(doc.body);
              console.log(`TOC ${tocItem.href}: ${content.length} chars`);
              if (content.length > 50) {
                chapters.push({ title: tocItem.label.trim().replace(/\s+/g, ' '), content });
              }
            } catch (err) {
              console.warn(`Failed to load TOC section ${tocItem.href}:`, err);
            }
          }
        }
    }

    console.log(`Successfully parsed ${chapters.length} chapters`);
    return { title: bookTitle, chapters };

  } catch (err) {
    console.error('EPUB parsing error:', err);
    throw new Error(`Failed to parse EPUB: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
