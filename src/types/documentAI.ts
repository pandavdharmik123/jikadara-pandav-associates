/**
 * TypeScript Contracts & Interfaces for Document AI & Multilingual OCR Module
 */

export type PageType = 'digital' | 'scanned';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BlockType = 'heading' | 'paragraph' | 'table' | 'list' | 'caption' | 'image';

export interface DocumentBlock {
  id: string;
  type: BlockType;
  level?: number; // Heading level (1-6)
  content: string;
  confidence: number; // Score between 0.0 and 1.0
  pageNumber: number;
  bbox?: BoundingBox;
  language?: string;
}

export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  content: string;
  isHeader?: boolean;
}

export interface TableBlock extends DocumentBlock {
  type: 'table';
  rows: number;
  cols: number;
  cells: TableCell[][];
  htmlContent: string;
}

export interface PageMetadata {
  pageNumber: number;
  pageType: PageType;
  characterCount: number;
  ocrConfidence: number;
  detectedLanguages: string[];
}

export interface DocumentSummary {
  digitalPagesCount: number;
  scannedPagesCount: number;
  primaryLanguages: string[];
}

export interface DocumentOutput {
  markdown: string;
  html: string;
  json: {
    summary: DocumentSummary;
    pages: PageMetadata[];
    blocks: DocumentBlock[];
  };
}

export interface DocumentReadResponse {
  success: boolean;
  documentId: string;
  fileName: string;
  totalPages: number;
  overallConfidence: number;
  processingTimeMs: number;
  summary: DocumentSummary;
  output: DocumentOutput;
  error?: string;
}
