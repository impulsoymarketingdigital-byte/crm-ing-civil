import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InventoryItemType } from '@prisma/client';
import { InventoryService } from '../application/inventory.service';
import { CreateInventoryItemDto } from '../domain/dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../domain/dto/update-inventory-item.dto';
import { StockEntryDto } from '../domain/dto/stock-entry.dto';
import { StockExitDto } from '../domain/dto/stock-exit.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ── Products ──────────────────────────────────────────────────────────────

  /** GET /api/v1/inventory?type=PRODUCT */
  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  findAll(@TenantId() tenantId: string, @Query('type') type?: InventoryItemType) {
    return this.service.findAll(tenantId, type);
  }

  /** GET /api/v1/inventory/stock/valuation */
  @Get('stock/valuation')
  @RequirePermissions(Permission.INVENTORY_READ)
  getStockValuation(@TenantId() tenantId: string) {
    return this.service.getStockValuation(tenantId);
  }

  /** GET /api/v1/inventory/:id */
  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  /** POST /api/v1/inventory */
  @Post()
  @RequirePermissions(Permission.INVENTORY_WRITE)
  @HttpCode(HttpStatus.CREATED)
  create(@TenantId() tenantId: string, @Body() dto: CreateInventoryItemDto) {
    return this.service.create(tenantId, dto);
  }

  /** PATCH /api/v1/inventory/:id */
  @Patch(':id')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  /** DELETE /api/v1/inventory/:id  (soft delete) */
  @Delete(':id')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  deactivate(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.service.deactivate(id, tenantId);
  }

  // ── Stock Transactions ────────────────────────────────────────────────────

  /**
   * POST /api/v1/inventory/:id/stock/entry
   * Receive goods — increases qty and recalculates WAC.
   */
  @Post(':id/stock/entry')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  @HttpCode(HttpStatus.CREATED)
  stockEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: StockEntryDto,
  ) {
    return this.service.recordStockEntry(id, tenantId, dto);
  }

  /**
   * POST /api/v1/inventory/:id/stock/exit
   * Dispatch goods — decreases qty; 422 if insufficient stock.
   */
  @Post(':id/stock/exit')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  @HttpCode(HttpStatus.CREATED)
  stockExit(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: StockExitDto,
  ) {
    return this.service.recordStockExit(id, tenantId, dto);
  }

  /**
   * GET /api/v1/inventory/:id/stock/transactions
   * Full movement history for one SKU.
   */
  @Get(':id/stock/transactions')
  @RequirePermissions(Permission.INVENTORY_READ)
  getTransactions(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.service.getTransactions(id, tenantId);
  }
}
