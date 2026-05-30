import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateOfficialBudgetDto } from '../domain/dto/create-budget.dto';
import { CreateBudgetChapterDto } from '../domain/dto/create-chapter.dto';
import { CreateBudgetLineDto } from '../domain/dto/create-line.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Budgets ────────────────────────────────────────────────────────────────

  findAll(tenantId: string, projectId?: string) {
    return this.prisma.officialBudget.findMany({
      where: { tenantId, ...(projectId ? { projectId } : {}) },
      include: {
        chapters: {
          include: { lines: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const b = await this.prisma.officialBudget.findFirst({
      where: { id, tenantId },
      include: {
        chapters: {
          include: { lines: { include: { apuItem: true }, orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!b) throw new NotFoundException('Budget not found');
    return b;
  }

  async create(tenantId: string, dto: CreateOfficialBudgetDto) {
    // Get next version for this project
    const lastVersion = await this.prisma.officialBudget.findFirst({
      where: { tenantId, projectId: dto.projectId },
      orderBy: { version: 'desc' },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    return this.prisma.officialBudget.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        name: dto.name,
        version,
        adminPct:  dto.adminPct  ?? 0,
        riskPct:   dto.riskPct   ?? 0,
        profitPct: dto.profitPct ?? 0,
      },
    });
  }

  async approve(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.officialBudget.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  // ── Chapters ───────────────────────────────────────────────────────────────

  async addChapter(budgetId: string, tenantId: string, dto: CreateBudgetChapterDto) {
    await this.findOne(budgetId, tenantId);
    return this.prisma.budgetChapter.create({
      data: {
        budgetId,
        code: dto.code,
        name: dto.name,
        order: dto.order ?? 0,
      },
    });
  }

  // ── Lines ──────────────────────────────────────────────────────────────────

  async addLine(budgetId: string, tenantId: string, dto: CreateBudgetLineDto) {
    const budget = await this.findOne(budgetId, tenantId);
    if (budget.status === 'APPROVED') {
      throw new BadRequestException('Cannot modify an approved budget — create a new version');
    }

    // If linked to APU, use its totalUnitCost as unit cost if not provided explicitly
    let unitCost = dto.unitCost;
    if (dto.apuItemId) {
      const apu = await this.prisma.apuItem.findFirst({ where: { id: dto.apuItemId, tenantId } });
      if (!apu) throw new NotFoundException('APU item not found');
      if (unitCost === 0) unitCost = Number(apu.totalUnitCost);
    }

    const totalCost = r2(dto.quantity * unitCost);

    const line = await this.prisma.budgetLine.create({
      data: {
        budgetId,
        chapterId: dto.chapterId,
        apuItemId: dto.apuItemId,
        code:       dto.code,
        description: dto.description,
        unit:       dto.unit ?? 'GL',
        quantity:   dto.quantity,
        unitCost,
        totalCost,
        order:      dto.order ?? 0,
      },
    });

    await this._recomputeBudget(budgetId);
    return line;
  }

  async deleteLine(lineId: string, tenantId: string) {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId },
      include: { budget: true },
    });
    if (!line || line.budget.tenantId !== tenantId) throw new NotFoundException('Line not found');
    if (line.budget.status === 'APPROVED') {
      throw new BadRequestException('Cannot modify an approved budget');
    }
    await this.prisma.budgetLine.delete({ where: { id: lineId } });
    await this._recomputeBudget(line.budgetId);
    return { deleted: lineId };
  }

  /** Recomputes chapter totals and budget-level AIU totals */
  private async _recomputeBudget(budgetId: string) {
    const budget = await this.prisma.officialBudget.findUniqueOrThrow({
      where: { id: budgetId },
      include: { chapters: { include: { lines: true } } },
    });

    let directCost = 0;

    for (const chapter of budget.chapters) {
      const chapterTotal = chapter.lines.reduce((s, l) => s + Number(l.totalCost), 0);
      directCost += chapterTotal;
      await this.prisma.budgetChapter.update({
        where: { id: chapter.id },
        data: { totalCost: r2(chapterTotal) },
      });
    }

    const adminAmount  = r2(directCost * Number(budget.adminPct));
    const riskAmount   = r2(directCost * Number(budget.riskPct));
    const profitAmount = r2(directCost * Number(budget.profitPct));
    const aiuAmount    = r2(adminAmount + riskAmount + profitAmount);
    const totalBudget  = r2(directCost + aiuAmount);

    return this.prisma.officialBudget.update({
      where: { id: budgetId },
      data: { directCost: r2(directCost), adminAmount, riskAmount, profitAmount, aiuAmount, totalBudget },
    });
  }

  /** Budget vs actual comparison */
  async budgetVsActual(budgetId: string, tenantId: string) {
    const budget = await this.findOne(budgetId, tenantId);

    // Sum executed from approved/paid certificates
    const certLines = await this.prisma.certificateLine.findMany({
      where: {
        certificate: { budgetId, status: { in: ['APPROVED', 'PAID'] } },
      },
      include: { budgetLine: true },
    });

    const executedByLine: Record<string, number> = {};
    for (const cl of certLines) {
      executedByLine[cl.budgetLineId] = (executedByLine[cl.budgetLineId] ?? 0) + Number(cl.currentAmount);
    }

    const totalBudgeted = Number(budget.totalBudget);
    const totalExecuted = Object.values(executedByLine).reduce((s, v) => s + v, 0);

    return {
      budgetId,
      totalBudgeted,
      totalExecuted: r2(totalExecuted),
      remaining:     r2(totalBudgeted - totalExecuted),
      executedPct:   totalBudgeted > 0 ? r2((totalExecuted / totalBudgeted) * 100) : 0,
      chapters:      budget.chapters,
      executedByLine,
    };
  }
}
