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
import { InvoiceStatus } from '@prisma/client';
import { CustomerService } from '../application/customer.service';
import { InvoiceService } from '../application/invoice.service';
import { CreateCustomerDto } from '../domain/dto/create-customer.dto';
import { UpdateCustomerDto } from '../domain/dto/update-customer.dto';
import { CreateInvoiceDto } from '../domain/dto/create-invoice.dto';
import { IssueInvoiceDto } from '../domain/dto/issue-invoice.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';

// ── Customers ─────────────────────────────────────────────────────────────────
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()  @RequirePermissions(Permission.CUSTOMER_READ)
  findAll(@TenantId() tenantId: string) { return this.customerService.findAll(tenantId); }

  @Get(':id') @RequirePermissions(Permission.CUSTOMER_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) {
    return this.customerService.findOne(id, t);
  }

  @Post() @RequirePermissions(Permission.CUSTOMER_WRITE) @HttpCode(HttpStatus.CREATED)
  create(@TenantId() t: string, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(t, dto);
  }

  @Patch(':id') @RequirePermissions(Permission.CUSTOMER_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, t, dto);
  }

  @Delete(':id') @RequirePermissions(Permission.CUSTOMER_WRITE)
  deactivate(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) {
    return this.customerService.deactivate(id, t);
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────────
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * GET /api/v1/invoices?status=ISSUED
   */
  @Get() @RequirePermissions(Permission.INVOICE_READ)
  findAll(@TenantId() t: string, @Query('status') status?: InvoiceStatus) {
    return this.invoiceService.findAll(t, status);
  }

  /**
   * GET /api/v1/invoices/:id  — full detail with lines + journal entry
   */
  @Get(':id') @RequirePermissions(Permission.INVOICE_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) {
    return this.invoiceService.findOne(id, t);
  }

  /**
   * POST /api/v1/invoices  — creates invoice in DRAFT
   */
  @Post() @RequirePermissions(Permission.INVOICE_WRITE) @HttpCode(HttpStatus.CREATED)
  create(@TenantId() t: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(t, dto);
  }

  /**
   * POST /api/v1/invoices/:id/issue
   *
   * Atomic transaction:
   *   1. Stock EXIT for all inventory-linked lines
   *   2. Auto-POSTED journal entry  (Dr AR / Cr Revenue / Cr Tax)
   *   3. Invoice status → ISSUED
   */
  @Post(':id/issue')
  @RequirePermissions(Permission.INVOICE_ISSUE)
  @HttpCode(HttpStatus.OK)
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() t: string,
    @Body() dto: IssueInvoiceDto,
  ) {
    return this.invoiceService.issueInvoice(id, t, dto);
  }
}
