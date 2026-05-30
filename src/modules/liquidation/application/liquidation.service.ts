import {
  BadRequestException, ConflictException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateLiquidationDto } from '../domain/dto/create-liquidation.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class LiquidationService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string, tenantId: string) {
    const liq = await this.prisma.projectLiquidation.findFirst({
      where: { projectId, tenantId },
      include: { deductions: true },
    });
    if (!liq) throw new NotFoundException('Liquidation not found for this project');
    return liq;
  }

  async findOne(id: string, tenantId: string) {
    const liq = await this.prisma.projectLiquidation.findFirst({
      where: { id, tenantId },
      include: { deductions: true },
    });
    if (!liq) throw new NotFoundException('Liquidation not found');
    return liq;
  }

  async create(tenantId: string, dto: CreateLiquidationDto) {
    // Only one liquidation per project
    const existing = await this.prisma.projectLiquidation.findFirst({
      where: { projectId: dto.projectId },
    });
    if (existing) throw new ConflictException('A liquidation already exists for this project');

    // Auto-compute totalExecuted from approved/paid certificates
    const certs = await this.prisma.projectCertificate.findMany({
      where: { projectId: dto.projectId, status: { in: ['APPROVED', 'PAID'] } },
    });
    const totalExecuted   = r2(certs.reduce((s, c) => s + Number(c.grossAmount), 0));
    const totalRetained   = r2(certs.reduce((s, c) => s + Number(c.retentionAmount), 0));

    const additionsValue      = dto.additionsValue ?? 0;
    const totalContractValue  = r2(dto.contractValue + additionsValue);

    const totalDeductions = r2(dto.deductions.reduce((s, d) => s + d.amount, 0));
    const netBalance      = r2(totalExecuted - totalRetained - totalDeductions);

    return this.prisma.projectLiquidation.create({
      data: {
        tenantId,
        projectId:        dto.projectId,
        budgetId:         dto.budgetId,
        liquidationDate:  new Date(dto.liquidationDate),
        contractValue:    dto.contractValue,
        additionsValue,
        totalContractValue,
        totalExecuted,
        totalRetained,
        totalDeductions,
        netBalance,
        notes:            dto.notes,
        deductions: {
          create: dto.deductions.map(d => ({
            type:        d.type,
            description: d.description,
            amount:      d.amount,
          })),
        },
      },
      include: { deductions: true },
    });
  }

  async finalize(id: string, tenantId: string) {
    const liq = await this.findOne(id, tenantId);
    if (liq.status === 'FINAL') throw new BadRequestException('Already finalized');
    return this.prisma.projectLiquidation.update({
      where: { id },
      data: { status: 'FINAL' },
    });
  }

  /** Full liquidation statement */
  async statement(id: string, tenantId: string) {
    const liq = await this.findOne(id, tenantId);

    const certs = await this.prisma.projectCertificate.findMany({
      where: { projectId: liq.projectId, tenantId, status: { in: ['APPROVED', 'PAID'] } },
      orderBy: { number: 'asc' },
    });

    const budget = await this.prisma.officialBudget.findFirst({
      where: { id: liq.budgetId, tenantId },
    });

    return {
      liquidation: liq,
      budget: {
        totalBudget:  budget ? Number(budget.totalBudget)  : 0,
        directCost:   budget ? Number(budget.directCost)   : 0,
        aiuAmount:    budget ? Number(budget.aiuAmount)    : 0,
      },
      certificates: certs.map(c => ({
        number:          c.number,
        certDate:        c.certDate,
        grossAmount:     Number(c.grossAmount),
        retentionAmount: Number(c.retentionAmount),
        netAmount:       Number(c.netAmount),
        status:          c.status,
      })),
      summary: {
        contractValue:    Number(liq.contractValue),
        additionsValue:   Number(liq.additionsValue),
        totalContractValue: Number(liq.totalContractValue),
        totalExecuted:    Number(liq.totalExecuted),
        executedPct:      Number(liq.totalContractValue) > 0
          ? r2((Number(liq.totalExecuted) / Number(liq.totalContractValue)) * 100)
          : 0,
        totalRetained:    Number(liq.totalRetained),
        deductions:       liq.deductions.map(d => ({
          type: d.type, description: d.description, amount: Number(d.amount),
        })),
        totalDeductions:  Number(liq.totalDeductions),
        netBalance:       Number(liq.netBalance),
      },
    };
  }
}
