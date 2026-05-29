import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class ProcessInvoiceOcrDto {
  /**
   * Plain text extracted from the supplier invoice via OCR.
   * Include all visible text: amounts, dates, addresses, line items.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  ocrText: string;

  /**
   * Account to DEBIT for the expense (e.g., Purchases / Expenses).
   * When tax is present and taxAccountId is not provided,
   * the entire total is debited here.
   */
  @IsUUID()
  expenseAccountId: string;

  /**
   * Account to CREDIT for the liability (Accounts Payable).
   * Always credited with invoice.total.
   */
  @IsUUID()
  payableAccountId: string;

  /**
   * Account to DEBIT for recoverable tax (IVA Crédito Fiscal, etc.).
   * Required when the extracted taxAmount > 0; otherwise optional.
   * If omitted with tax present, the entire total is absorbed into expenseAccountId.
   */
  @IsOptional()
  @IsUUID()
  taxAccountId?: string;

  /**
   * Override the auto-generated journal entry reference.
   * Defaults to  AI-{invoiceNumber or timestamp}.
   */
  @IsOptional()
  @IsString()
  reference?: string;
}
