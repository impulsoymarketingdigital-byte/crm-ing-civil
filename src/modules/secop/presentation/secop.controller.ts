import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { SecopService } from '../application/secop.service';

@UseGuards(JwtAuthGuard)
@Controller('secop')
export class SecopController {
  constructor(private readonly svc: SecopService) {}

  @Get('search') @RequirePermissions(Permission.SECOP_SEARCH)
  search(
    @Query('keyword') keyword = '',
    @Query('page')    page    = '1',
    @Query('limit')   limit   = '10',
    @Query('entity')  entity?: string,
    @Query('status')  status?: string,
  ) {
    return this.svc.search({ keyword, page: +page, limit: +limit, entity, status });
  }

  @Get('latest') @RequirePermissions(Permission.SECOP_SEARCH)
  latest(@Query('limit') limit = '20') { return this.svc.latest(+limit); }

  @Get('infrastructure') @RequirePermissions(Permission.SECOP_SEARCH)
  infrastructure(@Query('keyword') keyword = '', @Query('page') page = '1') {
    return this.svc.infrastructureSearch(keyword, +page);
  }
}
