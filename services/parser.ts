import { Chapter } from '../types';

// A set of common, non-chapter headings found in book text files.
// This helps prevent metadata and front matter from being misidentified as chapters.
const BANNED_TITLES = new Set([
  'CONTENTS',
  'TABLE OF CONTENTS',
  'COVER',
  'TITLE',
  'AUTHOR',
  'COPYRIGHT',
  'DEDICATION',
  'PUBLISHING HISTORY',
  'ACKNOWLEDGMENTS',
  'EPIGRAPH',
]);


/**
 * Extract book title from text file (usually the first non-empty line)
 */
export function extractBookTitle(text: string): string {
  if (!text) return 'Untitled Book';

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Return first non-empty line as title, max 100 chars
    if (trimmed.length > 0) {
      return trimmed.substring(0, 100);
    }
  }

  return 'Untitled Book';
}

const ROMAN = '[IVXLCDM]+';

// "Chapter 12", "CHAPTER XIV", "Part 3", with an optional trailing title
// ("Chapter 1: The Beginning", "Chapter 1 - The Beginning").
const LABELLED_HEADING = new RegExp(
  `^(chapter|part|book|section)\\s+(\\d{1,3}|${ROMAN})\\b\\s*[.:\\u2013-]?\\s*(.{0,60})$`,
  'i'
);

// A bare numeral or roman numeral on its own line.
const BARE_NUMBER_HEADING = new RegExp(`^(\\d{1,3}|${ROMAN})[.)]?$`);

function hasCasedLetters(text: string): boolean {
  return text.toLowerCase() !== text.toUpperCase();
}

function isAllCapsHeading(line: string): boolean {
  // toUpperCase() is a no-op for scripts without case, so require cased letters
  // before treating "all caps" as meaningful.
  return (
    line.length < 50 &&
    hasCasedLetters(line) &&
    line === line.toUpperCase() &&
    !BANNED_TITLES.has(line)
  );
}

// Table-of-contents rows look like headings ("Chapter 1 ..... 7"), so reject
// lines that trail off into dot leaders or a page number.
const TOC_ROW = /(\.\s*){3,}|\s{3,}\d{1,4}$/;

function isChapterHeading(line: string): boolean {
  if (line.length === 0 || line.length > 60) return false;
  if (BANNED_TITLES.has(line.toUpperCase())) return false;
  if (TOC_ROW.test(line)) return false;

  if (LABELLED_HEADING.test(line)) return true;
  if (BARE_NUMBER_HEADING.test(line)) return true;
  return isAllCapsHeading(line);
}

export function parseChapters(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  if (!text) return chapters;

  // Leading blank lines let a heading on the very first line qualify.
  const lines = ('\n\n' + text.replace(/\r\n?/g, '\n')).split('\n');

  let currentChapter: { title: string; content: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Headings sit on their own line, after a blank line and before more text.
    const blankBefore = i >= 1 && lines[i - 1].trim() === '';
    const nextNonBlank = lines.slice(i + 1).find(l => l.trim() !== '');
    const hasBodyAfter = nextNonBlank !== undefined;

    if (blankBefore && hasBodyAfter && isChapterHeading(trimmedLine)) {
      if (currentChapter && currentChapter.content.trim()) {
        chapters.push({ ...currentChapter, content: currentChapter.content.trim() });
      }
      currentChapter = { title: trimmedLine, content: '' };
    } else if (currentChapter) {
      currentChapter.content += line + '\n';
    }
    // Any content before the first heading is ignored.
  }

  if (currentChapter && currentChapter.content.trim()) {
    chapters.push({ ...currentChapter, content: currentChapter.content.trim() });
  }

  return chapters;
}