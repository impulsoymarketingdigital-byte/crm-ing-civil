import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { JournalEntryStatus } from '@prisma/client';
import { LedgerService } from '../application/ledger.service';
import { CreateLedgerEntryDto } from '../domain/dto/create-ledger-entry.dto';
import { TrialBalanceQueryDto } from '../domain/dto/trial-balance-query.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  // ── Journal entries ───────────────────────────────────────────────────────

  /**
   * List journal entries for the authenticated tenant.
   * GET /api/v1/ledger/entries?status=POSTED
   */
  @Get('entries')
  @RequirePermissions(Permission.JOURNAL_READ)
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: JournalEntryStatus,
  ) {
    return this.ledgerService.findAll(tenantId, status);
  }

  /**
   * Get a single journal entry with all lines.
   * GET /api/v1/ledger/entries/:id
   */
  @Get('entries/:id')
  @RequirePermissions(Permission.JOURNAL_READ)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.ledgerService.findOne(id, tenantId);
  }

  /**
   * Create a new journal entry (DRAFT status).
   * Enforces strict Decimal balance: Σ debit must equal Σ credit.
   *
   * POST /api/v1/ledger/entries
   */
  @Post('entries')
  @RequirePermissions(Permission.JOURNAL_WRITE)
  @HttpCode(HttpStatus.CREATED)
  create(@TenantId() tenantId: string, @Body() dto: CreateLedgerEntryDto) {
    return this.ledgerService.createEntry(tenantId, dto);
  }

  /**
   * Post a DRAFT entry — makes it immutable and visible in the trial balance.
   * PATCH /api/v1/ledger/entries/:id/post
   */
  @Patch('entries/:id/post')
  @RequirePermissions(Permission.JOURNAL_POST)
  postEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.ledgerService.postEntry(id, tenantId);
  }

  /**
   * Void a POSTED entry.
   * PATCH /api/v1/ledger/entries/:id/void
   */
  @Patch('entries/:id/void')
  @RequirePermissions(Permission.JOURNAL_VOID)
  voidEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.ledgerService.voidEntry(id, tenantId);
  }

  // ── Trial Balance ─────────────────────────────────────────────────────────

  /**
   * Calculate the trial balance for the authenticated tenant.
   * Only POSTED entries are included.
   *
   * GET /api/v1/ledger/trial-balance?dateFrom=2024-01-01&dateTo=2024-12-31
   */
  @Get('trial-balance')
  @RequirePermissions(Permission.ACCOUNT_READ, Permission.JOURNAL_READ)
  getTrialBalance(
    @TenantId() tenantId: string,
    @Query() query: TrialBalanceQueryDto,
  ) {
    return this.ledgerService.getTrialBalance(tenantId, query);
  }
}
