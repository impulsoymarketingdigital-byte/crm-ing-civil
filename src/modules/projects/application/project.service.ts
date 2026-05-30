import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AiuService } from './aiu.service';
import { CreateProjectDto } from '../domain/dto/create-project.dto';
import { UpdateProjectDto } from '../domain/dto/update-project.dto';
import { CreatePhaseDto } from '../domain/dto/create-phase.dto';
import { CreateBudgetDto } from '../domain/dto/create-budget.dto';
import { AiuCalculateDto } from '../domain/dto/aiu-calculate.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiuSvc: AiuService,
  ) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  findAll(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      include: { phases: { orderBy: { order: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        phases: { orderBy: { order: 'asc' } },
        budgets: { orderBy: { category: 'asc' } },
        aiuBreakdowns: { orderBy: { version: 'desc' }, take: 5 },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(tenantId: string, dto: CreateProjectDto, userId?: string) {
    const exists = await this.prisma.project.findFirst({
      where: { code: dto.code, tenantId },
    });
    if (exists) throw new ConflictException(`Project code "${dto.code}" already exists`);

    const aiu = this.aiuSvc.calculate(
      dto.contractValue ?? 0,
      dto.adminPct ?? 0,
      dto.riskPct ?? 0,
      dto.profitPct ?? 0,
    );

    return this.prisma.project.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        clientName: dto.clientName,
        location: dto.location,
        contractValue: aiu.contractValue,
        adminPct: aiu.adminPct,
        riskPct: aiu.riskPct,
        profitPct: aiu.profitPct,
        adminAmount: aiu.adminAmount,
        riskAmount: aiu.riskAmount,
        profitAmount: aiu.profitAmount,
        aiuAmount: aiu.aiuAmount,
        totalValue: aiu.totalValue,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdBy: userId,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateProjectDto, userId?: string) {
    const project = await this.findOne(id, tenantId);

    // Recalculate AIU if any financial field changes
    const contractValue = dto.contractValue ?? Number(project.contractValue);
    const adminPct = dto.adminPct ?? Number(project.adminPct);
    const riskPct = dto.riskPct ?? Number(project.riskPct);
    const profitPct = dto.profitPct ?? Number(project.profitPct);
    const aiu = this.aiuSvc.calculate(contractValue, adminPct, riskPct, profitPct);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        contractValue: aiu.contractValue,
        adminPct: aiu.adminPct,
        riskPct: aiu.riskPct,
        profitPct: aiu.profitPct,
        adminAmount: aiu.adminAmount,
        riskAmount: aiu.riskAmount,
        profitAmount: aiu.profitAmount,
        aiuAmount: aiu.aiuAmount,
        totalValue: aiu.totalValue,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  // ── AIU standalone calculation (no persistence) ───────────────────────────

  calculateAiu(dto: AiuCalculateDto) {
    return this.aiuSvc.calculate(dto.contractValue, dto.adminPct, dto.riskPct, dto.profitPct);
  }

  async saveAiuBreakdown(
    projectId: string,
    tenantId: string,
    dto: AiuCalculateDto,
    description?: string,
    userId?: string,
  ) {
    await this.findOne(projectId, tenantId); // ownership check
    const aiu = this.aiuSvc.calculate(dto.contractValue, dto.adminPct, dto.riskPct, dto.profitPct);

    const last = await this.prisma.aiuBreakdown.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    return this.prisma.aiuBreakdown.create({
      data: {
        projectId,
        version: (last?.version ?? 0) + 1,
        description,
        createdBy: userId,
        ...aiu,
      },
    });
  }

  // ── Phases ────────────────────────────────────────────────────────────────

  async addPhase(projectId: string, tenantId: string, dto: CreatePhaseDto) {
    await this.findOne(projectId, tenantId);
    return this.prisma.projectPhase.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        order: dto.order ?? 0,
        plannedPct: dto.plannedPct ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async updatePhaseProgress(phaseId: string, tenantId: string, actualPct: number) {
    const phase = await this.prisma.projectPhase.findFirst({
      where: { id: phaseId, project: { tenantId } },
    });
    if (!phase) throw new NotFoundException('Phase not found');
    return this.prisma.projectPhase.update({
      where: { id: phaseId },
      data: { actualPct },
    });
  }

  // ── Budget lines ──────────────────────────────────────────────────────────

  async addBudgetLine(projectId: string, tenantId: string, dto: CreateBudgetDto) {
    await this.findOne(projectId, tenantId);
    const totalCost = dto.quantity * dto.unitCost;
    return this.prisma.projectBudget.create({
      data: {
        projectId,
        category: dto.category,
        description: dto.description,
        unit: dto.unit ?? 'GL',
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        totalCost,
      },
    });
  }

  async getBudgetSummary(projectId: string, tenantId: string) {
    await this.findOne(projectId, tenantId);
    const lines = await this.prisma.projectBudget.findMany({ where: { projectId } });

    const byCategory = lines.reduce<Record<string, { planned: number; actual: number }>>(
      (acc, l) => {
        acc[l.category] ??= { planned: 0, actual: 0 };
        acc[l.category].planned += Number(l.totalCost);
        acc[l.category].actual += Number(l.actualCost);
        return acc;
      },
      {},
    );

    const totalPlanned = lines.reduce((s, l) => s + Number(l.totalCost), 0);
    const totalActual = lines.reduce((s, l) => s + Number(l.actualCost), 0);

    return { projectId, byCategory, totalPlanned, totalActual };
  }
}
