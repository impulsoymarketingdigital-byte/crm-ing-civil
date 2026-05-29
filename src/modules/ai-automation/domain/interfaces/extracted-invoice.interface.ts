/** Structured data extracted by Claude from an OCR invoice scan */
export interface ExtractedInvoiceData {
  supplier: string;
  invoiceNumber: string | null;
  /** ISO 8601 date: YYYY-MM-DD, or null if not found */
  date: string | null;
  /** Pre-tax amount */
  subtotal: number;
  /** Tax amount (0 when no tax found) */
  taxAmount: number;
  /** Grand total including tax */
  total: number;
  /** Tax rate as decimal fraction, e.g. 0.19 = 19% */
  taxRate: number | null;
  /** ISO 4217 currency code, defaults to USD */
  currency: string;
  /** Brief description of goods/services */
  description: string;
}

export interface AiUsageStats {
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from the prompt cache (reduces cost) */
  cacheReadTokens: number;
  /** Tokens written to the prompt cache (one-time write cost) */
  cacheCreationTokens: number;
}

export interface ProcessOcrResult {
  extractedData: ExtractedInvoiceData;
  journalEntryDraft: {
    id: string;
    reference: string;
    description: string;
    date: Date;
    status: string;
    lines: Array<{
      accountId: string;
      description: string | null;
      debit: string;
      credit: string;
    }>;
  };
  aiUsage: AiUsageStats;
}
