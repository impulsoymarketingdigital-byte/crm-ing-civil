import { IsOptional, IsUUID } from 'class-validator';

/**
 * Accounts required to generate the balanced journal entry on issue:
 *
 *   Dr  Accounts Receivable  (arAccountId)       = invoice.total
 *   Cr  Revenue              (revenueAccountId)   = invoice.subtotal
 *   Cr  Tax Payable          (taxAccountId?)      = invoice.taxAmount  [if tax > 0]
 */
export class IssueInvoiceDto {
  @IsUUID() arAccountId: string;
  @IsUUID() revenueAccountId: string;

  /** Required only when the invoice has taxAmount > 0 */
  @IsOptional() @IsUUID() taxAccountId?: string;
}
