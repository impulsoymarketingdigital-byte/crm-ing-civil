import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { PettyCashService, CreateFundDto, CreateTransactionDto } from '../application/petty-cash.service';

@UseGuards(JwtAuthGuard)
@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly svc: PettyCashService) {}

  @Get('funds')
  listFunds(@TenantId() t: string) { return this.svc.findAllFunds(t); }

  @Get('funds/:id')
  getFund(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) { return this.svc.findFund(id, t); }

  @Post('funds')
  createFund(@Body() dto: CreateFundDto, @TenantId() t: string) { return this.svc.createFund(t, dto); }

  @Post('funds/:id/transactions')
  addTransaction(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTransactionDto, @TenantId() t: string) {
    return this.svc.addTransaction(id, t, dto);
  }

  @Patch('funds/:id/reimburse')
  reimburse(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) { return this.svc.reimburse(id, t); }

  @Patch('funds/:id/close')
  close(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) { return this.svc.closeFund(id, t); }
}
