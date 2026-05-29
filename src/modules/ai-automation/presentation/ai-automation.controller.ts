import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AiAutomationService } from '../application/ai-automation.service';
import { ProcessInvoiceOcrDto } from '../domain/dto/process-invoice-ocr.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';

@Controller('ai')
export class AiAutomationController {
  constructor(private readonly aiService: AiAutomationService) {}

  /**
   * POST /api/v1/ai/invoice-ocr
   *
   * Accepts a block of OCR text from a supplier invoice and returns:
   *  • extractedData   — structured JSON extracted by Claude
   *  • journalEntryDraft — DRAFT accounting entry (Dr Expense / Cr Payable)
   *  • aiUsage         — token counts + cache hit stats
   *
   * The system prompt is cached on Claude's side, so repeated calls within
   * 5 minutes pay only for the new OCR text tokens, not the full prompt.
   */
  @Post('invoice-ocr')
  @RequirePermissions(Permission.AI_USE)
  @HttpCode(HttpStatus.OK)
  processInvoiceOcr(
    @TenantId() tenantId: string,
    @Body() dto: ProcessInvoiceOcrDto,
  ) {
    return this.aiService.processSupplierInvoiceOcr(tenantId, dto);
  }
}
