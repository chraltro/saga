
export interface Chapter {
  title: string;
  content: string;
}

export interface Summary {
  bullets: string[];
  quote: string;
}

export interface BookRecord {
  id?: number;
  title: string;
  chapters: Chapter[];
  summaries: Record<number, Summary>;
  images: Record<number, string>;
  lastAccessed: number;
}
