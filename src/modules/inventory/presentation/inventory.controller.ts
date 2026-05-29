import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { InventoryService } from '../application/inventory.service';
import { CreateInventoryItemDto } from '../domain/dto/create-inventory-item.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { InventoryItemType } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  findAll(@TenantId() tenantId: string, @Query('type') type?: InventoryItemType) {
    return this.service.findAll(tenantId, type);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions(Permission.INVENTORY_WRITE)
  create(@Body() dto: CreateInventoryItemDto) {
    return this.service.create(dto);
  }

  @Patch(':id/stock')
  @RequirePermissions(Permission.INVENTORY_WRITE)
  adjustStock(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body('delta') delta: number,
  ) {
    return this.service.adjustStock(id, tenantId, delta);
  }
}
