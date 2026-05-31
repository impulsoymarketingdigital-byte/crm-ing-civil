import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SecopService } from '../application/secop.service';

@UseGuards(JwtAuthGuard)
@Controller('secop')
export class SecopController {
  constructor(private readonly svc: SecopService) {}

  /**
   * GET /secop/search?keyword=puente&page=1&limit=10&entity=IDU&status=ADJUDICADO
   * Search SECOP II procurement processes
   */
  @Get('search')
  search(
    @Query('keyword') keyword = '',
    @Query('page')    page    = '1',
    @Query('limit')   limit   = '10',
    @Query('entity')  entity?: string,
    @Query('status')  status?: string,
  ) {
    return this.svc.search({ keyword, page: +page, limit: +limit, entity, status });
  }

  /**
   * GET /secop/latest?limit=20
   * Returns the most recently published processes
   */
  @Get('latest')
  latest(@Query('limit') limit = '20') {
    return this.svc.latest(+limit);
  }

  /**
   * GET /secop/infrastructure?keyword=puente&page=1
   * Returns civil engineering / infrastructure procurement processes
   */
  @Get('infrastructure')
  infrastructure(
    @Query('keyword') keyword = '',
    @Query('page')    page    = '1',
  ) {
    return this.svc.infrastructureSearch(keyword, +page);
  }
}
