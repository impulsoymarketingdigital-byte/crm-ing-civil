import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateApuChapterDto } from '../domain/dto/create-apu-chapter.dto';
import { CreateApuItemDto } from '../domain/dto/create-apu-item.dto';
import { CreateApuInputDto } from '../domain/dto/create-apu-input.dto';

const r4 = (n: number) => Math.round(n * 10000) / 10000;

@Injectable()
export class ApuService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Chapters ───────────────────────────────────────────────────────────────

  findAllChapters(tenantId: string) {
    return this.prisma.apuChapter.findMany({
      where: { tenantId },
      include: { items: { where: { isActive: true }, orderBy: { code: 'asc' } } },
      orderBy: { order: 'asc' },
    });
  }

  async createChapter(tenantId: string, dto: CreateApuChapterDto) {
    const exists = await this.prisma.apuChapter.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (exists) throw new ConflictException(`Chapter code "${dto.code}" already exists`);
    return this.prisma.apuChapter.create({
      data: { tenantId, code: dto.code, name: dto.name, order: dto.order ?? 0 },
    });
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  async findItem(id: string, tenantId: string) {
    const item = await this.prisma.apuItem.findFirst({
      where: { id, tenantId },
      include: { inputs: { orderBy: [{ type: 'asc' }] }, chapter: true },
    });
    if (!item) throw new NotFoundException('APU item not found');
    return item;
  }

  async createItem(tenantId: string, dto: CreateApuItemDto) {
    const exists = await this.prisma.apuItem.findFirst({ where: { tenantId, code: dto.code } });
    if (exists) throw new ConflictException(`APU code "${dto.code}" already exists`);

    const chapter = await this.prisma.apuChapter.findFirst({ where: { id: dto.chapterId, tenantId } });
    if (!chapter) throw new NotFoundException('APU chapter not found');

    return this.prisma.apuItem.create({
      data: {
        tenantId,
        chapterId: dto.chapterId,
        code: dto.code,
        name: dto.name,
        unit: dto.unit ?? 'GL',
        laborFactor: dto.laborFactor ?? 1.6,
      },
    });
  }

  async addInput(itemId: string, tenantId: string, dto: CreateApuInputDto) {
    const item = await this.findItem(itemId, tenantId);
    const total = r4(dto.quantity * dto.unitCost);

    await this.prisma.apuInput.create({
      data: {
        apuItemId: itemId,
        type: dto.type,
        description: dto.description,
        unit: dto.unit ?? 'UN',
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        total,
      },
    });

    // Recompute item totals
    return this._recomputeItem(itemId);
  }

  async deleteInput(inputId: string, tenantId: string) {
    const input = await this.prisma.apuInput.findFirst({
      where: { id: inputId },
      include: { apuItem: true },
    });
    if (!input || input.apuItem.tenantId !== tenantId) throw new NotFoundException('Input not found');
    await this.prisma.apuInput.delete({ where: { id: inputId } });
    return this._recomputeItem(input.apuItemId);
  }

  /** Recalculates materialCost, laborCost, equipmentCost, totalUnitCost */
  private async _recomputeItem(itemId: string) {
    const item = await this.prisma.apuItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { inputs: true },
    });

    let materialCost  = 0;
    let laborCost     = 0;
    let equipmentCost = 0;

    for (const inp of item.inputs) {
      const t = Number(inp.total);
      if (inp.type === 'MATERIAL')  materialCost  += t;
      if (inp.type === 'LABOR')     laborCost     += t;
      if (inp.type === 'EQUIPMENT') equipmentCost += t;
    }

    const factor = Number(item.laborFactor);
    const totalUnitCost = r4(materialCost + (laborCost * factor) + equipmentCost);

    return this.prisma.apuItem.update({
      where: { id: itemId },
      data: {
        materialCost:  r4(materialCost),
        laborCost:     r4(laborCost),
        equipmentCost: r4(equipmentCost),
        totalUnitCost,
      },
      include: { inputs: true },
    });
  }

  /** Returns all APU items in a chapter with cost breakdown */
  async chapterReport(chapterId: string, tenantId: string) {
    const chapter = await this.prisma.apuChapter.findFirst({
      where: { id: chapterId, tenantId },
      include: {
        items: {
          where: { isActive: true },
          include: { inputs: true },
          orderBy: { code: 'asc' },
        },
      },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    return chapter;
  }
}
