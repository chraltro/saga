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

export function parseChapters(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  if (!text) return chapters;

  // Prepending newlines ensures that a chapter title at the very beginning
  // of the file can be detected by the "four empty lines before" rule.
  const processedText = '\n\n\n\n' + text;
  const lines = processedText.split('\n');
  
  let currentChapter: { title: string; content: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // A potential chapter title is short, all-caps, contains letters, and is not a banned term.
    const isPotentiallyTitle =
      trimmedLine.length > 0 &&
      trimmedLine.length < 50 &&
      trimmedLine === trimmedLine.toUpperCase() &&
      /[A-Z]/.test(trimmedLine) &&
      !/^[0-9\s.,!?-]+$/.test(trimmedLine) &&
      !BANNED_TITLES.has(trimmedLine); // Exclude common non-chapter headings.
    
    // A line is a title if it meets the style criteria AND is preceded by at least four empty lines.
    const hasFourEmptyLinesBefore = i >= 4 && 
                                    lines[i - 1].trim() === '' && 
                                    lines[i - 2].trim() === '' &&
                                    lines[i - 3].trim() === '' &&
                                    lines[i - 4].trim() === '';

    if (isPotentiallyTitle && hasFourEmptyLinesBefore) {
      // This is a chapter title.
      if (currentChapter) {
        // Save the previous chapter, trimming trailing whitespace which includes the separator newlines.
        chapters.push({ ...currentChapter, content: currentChapter.content.trim() });
      }
      currentChapter = { title: trimmedLine, content: '' };
    } else if (currentChapter) {
      // This is a line of content for the current chapter.
      currentChapter.content += line + '\n';
    }
    // Any content before the first valid chapter title is ignored.
  }

  // Add the last chapter if it exists and has content.
  if (currentChapter && currentChapter.content.trim()) {
    chapters.push({ ...currentChapter, content: currentChapter.content.trim() });
  }
  
  return chapters;
}