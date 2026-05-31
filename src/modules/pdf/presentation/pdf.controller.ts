import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { PdfService } from '../application/pdf.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { LiquidationService } from '../../liquidation/application/liquidation.service';

@UseGuards(JwtAuthGuard)
@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfSvc: PdfService,
    private readonly prisma: PrismaService,
    private readonly liquidationSvc: LiquidationService,
  ) {}

  /** GET /pdf/payroll/:periodId — Colilla de nómina */
  @Get('payroll/:periodId')
  async payrollSlip(
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
      include: { employee: true },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    const buf = await this.pdfSvc.payrollSlip(period, period.employee);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="colilla-${period.employee.code}-${period.year}-${period.month}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }

  /** GET /pdf/certificates/:certId — Acta de avance */
  @Get('certificates/:certId')
  async certificatePdf(
    @Param('certId', ParseUUIDPipe) certId: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const cert = await this.prisma.projectCertificate.findFirst({
      where: { id: certId, tenantId },
      include: { lines: true, project: { select: { name: true, code: true } } },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    const buf = await this.pdfSvc.certificatePdf(cert, cert.lines);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="acta-${cert.number}-${cert.certDate.toISOString().slice(0, 10)}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }

  /** GET /pdf/liquidations/:liqId — Estado de cuenta liquidación */
  @Get('liquidations/:liqId')
  async liquidationPdf(
    @Param('liqId', ParseUUIDPipe) liqId: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const statement = await this.liquidationSvc.statement(liqId, tenantId);
    const buf = await this.pdfSvc.liquidationStatement(statement);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="liquidacion-${liqId.slice(0, 8)}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }
}
