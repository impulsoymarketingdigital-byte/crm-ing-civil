import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateCertificateDto } from '../domain/dto/create-certificate.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, projectId?: string) {
    return this.prisma.projectCertificate.findMany({
      where: { tenantId, ...(projectId ? { projectId } : {}) },
      include: { lines: true },
      orderBy: [{ projectId: 'asc' }, { number: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const cert = await this.prisma.projectCertificate.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { budgetLine: true } } },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async create(tenantId: string, dto: CreateCertificateDto) {
    // Auto-number: next for this project
    const last = await this.prisma.projectCertificate.findFirst({
      where: { projectId: dto.projectId },
      orderBy: { number: 'desc' },
    });
    const number = (last?.number ?? 0) + 1;

    // Previous cumulative executed amount for this budget
    const prevCerts = await this.prisma.projectCertificate.findMany({
      where: { projectId: dto.projectId, status: { in: ['APPROVED', 'PAID'] } },
    });
    const prevCumulativeAmount = prevCerts.reduce((s, c) => s + Number(c.grossAmount), 0);

    // Get budget total for pct calculation
    const budget = await this.prisma.officialBudget.findFirst({ where: { id: dto.budgetId, tenantId } });
    if (!budget) throw new NotFoundException('Budget not found');
    const totalBudget = Number(budget.totalBudget);

    // Build lines
    const retentionPct = dto.retentionPct ?? 0.05;
    let grossAmount = 0;

    const lineData = dto.lines.map(l => {
      const cumulativeQuantity = r4(l.previousQuantity + l.currentQuantity);
      const currentAmount = r2(l.currentQuantity * l.unitCost);
      const cumulativeAmount = r2(cumulativeQuantity * l.unitCost);
      const executedPct = l.totalQuantityBudgeted > 0
        ? r4((cumulativeQuantity / l.totalQuantityBudgeted) * 100)
        : 0;
      grossAmount += currentAmount;
      return {
        budgetLineId:         l.budgetLineId,
        description:          l.description,
        unit:                 l.unit ?? 'GL',
        totalQuantityBudgeted: l.totalQuantityBudgeted,
        previousQuantity:     l.previousQuantity,
        currentQuantity:      l.currentQuantity,
        cumulativeQuantity,
        unitCost:             l.unitCost,
        currentAmount,
        cumulativeAmount,
        executedPct,
      };
    });

    grossAmount = r2(grossAmount);
    const retentionAmount  = r2(grossAmount * retentionPct);
    const netAmount        = r2(grossAmount - retentionAmount);
    const cumulativeAmount = r2(prevCumulativeAmount + grossAmount);
    const cumulativePct    = totalBudget > 0 ? r4((cumulativeAmount / totalBudget) * 100) : 0;

    return this.prisma.projectCertificate.create({
      data: {
        tenantId,
        projectId:      dto.projectId,
        budgetId:       dto.budgetId,
        number,
        name:           dto.name,
        certDate:       new Date(dto.certDate),
        retentionPct,
        grossAmount,
        retentionAmount,
        netAmount,
        cumulativeAmount,
        cumulativePct,
        notes:          dto.notes,
        lines:          { create: lineData },
      },
      include: { lines: true },
    });
  }

  async approve(id: string, tenantId: string) {
    const cert = await this.findOne(id, tenantId);
    if (cert.status !== 'DRAFT' && cert.status !== 'SUBMITTED') {
      throw new BadRequestException('Only DRAFT or SUBMITTED certificates can be approved');
    }
    return this.prisma.projectCertificate.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async markPaid(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.projectCertificate.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async void(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.projectCertificate.update({
      where: { id },
      data: { status: 'VOIDED' },
    });
  }

  /** Progress summary: % executed per budget line */
  async progressReport(projectId: string, tenantId: string) {
    const certs = await this.prisma.projectCertificate.findMany({
      where: { projectId, tenantId, status: { in: ['APPROVED', 'PAID'] } },
      include: { lines: { include: { budgetLine: true } } },
      orderBy: { number: 'asc' },
    });

    const byLine: Record<string, {
      description: string; unit: string;
      totalBudgeted: number; cumulative: number; executedPct: number; cumulativeAmount: number;
    }> = {};

    for (const cert of certs) {
      for (const cl of cert.lines) {
        if (!byLine[cl.budgetLineId]) {
          byLine[cl.budgetLineId] = {
            description:     cl.description,
            unit:            cl.unit,
            totalBudgeted:   Number(cl.totalQuantityBudgeted),
            cumulative:      0,
            executedPct:     0,
            cumulativeAmount:0,
          };
        }
        byLine[cl.budgetLineId].cumulative       = Number(cl.cumulativeQuantity);
        byLine[cl.budgetLineId].executedPct      = Number(cl.executedPct);
        byLine[cl.budgetLineId].cumulativeAmount = Number(cl.cumulativeAmount);
      }
    }

    const totalCertified = certs.reduce((s, c) => s + Number(c.grossAmount), 0);
    const totalRetained  = certs.reduce((s, c) => s + Number(c.retentionAmount), 0);

    return { projectId, totalCertified: r2(totalCertified), totalRetained: r2(totalRetained), byLine };
  }
}
