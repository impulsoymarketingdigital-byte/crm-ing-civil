import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import type { default as PDFKit } from 'pdfkit';

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
const PCT = (n: number) => `${(Number(n) * 100).toFixed(2)}%`;

@Injectable()
export class PdfService {

  /** Generates a PDF Buffer from a builder function */
  private async build(builder: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        builder(doc);
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  // ── Colilla de Nómina ────────────────────────────────────────────────────────
  async payrollSlip(period: any, employee: any): Promise<Buffer> {
    return this.build(doc => {
      const tenant = period.tenant?.name ?? 'Empresa';
      const empName = `${employee.firstName} ${employee.lastName}`;

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('COLILLA DE NÓMINA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica').text(tenant, { align: 'center' });
      doc.moveDown(1);

      // Employee info box
      this._box(doc, 50, doc.y, 512, 80, () => {
        const y = doc.y + 10;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Empleado:', 60, y);         doc.font('Helvetica').text(empName, 140, y);
        doc.font('Helvetica-Bold').text('Cédula:', 310, y);  doc.font('Helvetica').text(employee.document ?? '-', 360, y);
        doc.font('Helvetica-Bold').text('Cargo:', 60, y + 18); doc.font('Helvetica').text(employee.position ?? '-', 140, y + 18);
        doc.font('Helvetica-Bold').text('Período:', 310, y + 18);
        const pLabel = period.fortnight === 0
          ? `${period.month}/${period.year} (mensual)`
          : `${period.month}/${period.year} Q${period.fortnight}`;
        doc.font('Helvetica').text(pLabel, 370, y + 18);
        doc.font('Helvetica-Bold').text('Salario base:', 60, y + 36);
        doc.font('Helvetica').text(COP(Number(period.baseSalary)), 155, y + 36);
        doc.font('Helvetica-Bold').text('Nivel ARL:', 310, y + 36);
        doc.font('Helvetica').text(employee.riskLevel ?? 'I', 375, y + 36);
      });

      doc.moveDown(1.5);

      // Two-column layout: Devengado | Deducciones
      const colW = 230;
      const leftX = 50, rightX = 312;
      let startY = doc.y;

      // Devengado
      doc.fontSize(10).font('Helvetica-Bold').text('DEVENGADO', leftX, startY);
      doc.moveDown(0.3);
      const earned: [string, number][] = [
        ['Salario básico',           Number(period.baseSalary)],
        ['Auxilio transporte',        Number(period.transportAllowance)],
        ['Horas extra diurnas (25%)', Number(period.overtimeDayPct25)],
        ['Horas extra nocturnas (75%)',Number(period.overtimeNightPct75)],
        ['H.E. festivos (75%)',       Number(period.overtimeHolidayPct75)],
        ['H.E. festivos noc. (100%)', Number(period.overtimeHolidayPct100)],
        ['Otros bonos',              Number(period.bonuses)],
      ].filter(([, v]) => (v as number) > 0) as [string, number][];

      let rowY = doc.y;
      earned.forEach(([label, val]) => {
        doc.fontSize(9).font('Helvetica').text(label, leftX + 8, rowY);
        doc.text(COP(val), leftX + 140, rowY, { width: 80, align: 'right' });
        rowY += 16;
      });
      doc.moveTo(leftX, rowY).lineTo(leftX + colW, rowY).lineWidth(0.5).stroke();
      rowY += 4;
      doc.fontSize(9).font('Helvetica-Bold').text('TOTAL DEVENGADO', leftX + 8, rowY);
      doc.text(COP(Number(period.totalEarned)), leftX + 140, rowY, { width: 80, align: 'right' });

      // Deducciones (right column)
      doc.fontSize(10).font('Helvetica-Bold').text('DEDUCCIONES', rightX, startY);
      let rowY2 = startY + 18;
      const deductions: [string, number][] = [
        ['Salud empleado (4%)',    Number(period.healthEmployee)],
        ['Pensión empleado (4%)',  Number(period.pensionEmployee)],
        ['Retención en la fuente', Number(period.incomeTax)],
        ['Otras deducciones',      Number(period.otherDeductions)],
      ].filter(([, v]) => (v as number) > 0) as [string, number][];
      deductions.forEach(([label, val]) => {
        doc.fontSize(9).font('Helvetica').text(label, rightX + 8, rowY2);
        doc.text(COP(val), rightX + 145, rowY2, { width: 70, align: 'right' });
        rowY2 += 16;
      });
      doc.moveTo(rightX, rowY2).lineTo(rightX + colW, rowY2).lineWidth(0.5).stroke();
      rowY2 += 4;
      doc.fontSize(9).font('Helvetica-Bold').text('TOTAL DEDUCCIONES', rightX + 8, rowY2);
      doc.text(COP(Number(period.totalDeductions)), rightX + 145, rowY2, { width: 70, align: 'right' });

      // NET PAY box
      const netY = Math.max(rowY, rowY2) + 24;
      doc.rect(leftX, netY, 512, 28).fillAndStroke('#1e3a5f', '#1e3a5f');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('white')
        .text('NETO A PAGAR:', leftX + 10, netY + 7)
        .text(COP(Number(period.netPay)), leftX + 330, netY + 7, { width: 170, align: 'right' });
      doc.fillColor('black');

      // Prestaciones sociales (accruals)
      const presY = netY + 48;
      doc.fontSize(10).font('Helvetica-Bold').text('PRESTACIONES SOCIALES (acumulado del período)', leftX, presY);
      doc.moveDown(0.3);
      const pres: [string, number][] = [
        ['Prima de servicios',       Number(period.prima)],
        ['Cesantías',                Number(period.cesantias)],
        ['Intereses sobre cesantías',Number(period.interesesCesantias)],
        ['Vacaciones',               Number(period.vacaciones)],
      ];
      let pY = doc.y;
      pres.forEach(([label, val]) => {
        doc.fontSize(9).font('Helvetica').text(label, leftX + 8, pY);
        doc.text(COP(val), 300, pY, { width: 100, align: 'right' });
        pY += 15;
      });

      // Aportes patronales
      const aportY = pY + 20;
      doc.fontSize(10).font('Helvetica-Bold').text('APORTES PATRONALES', leftX, aportY);
      doc.moveDown(0.3);
      const aportes: [string, number][] = [
        ['Salud empleador (8.5%)',   Number(period.healthEmployer)],
        ['Pensión empleador (12%)',  Number(period.pensionEmployer)],
        ['ARL',                      Number(period.arl)],
        ['SENA (2%)',                Number(period.sena)],
        ['ICBF (3%)',                Number(period.icbf)],
        ['Caja compensación (4%)',   Number(period.compensationBox)],
      ];
      let aY = doc.y;
      aportes.forEach(([label, val]) => {
        doc.fontSize(9).font('Helvetica').text(label, leftX + 8, aY);
        doc.text(COP(val), 300, aY, { width: 100, align: 'right' });
        aY += 15;
      });

      // Total costo
      doc.moveTo(leftX, aY + 4).lineTo(562, aY + 4).lineWidth(0.5).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text('COSTO TOTAL DEL TRABAJADOR:', leftX + 8, aY + 8);
      doc.text(COP(Number(period.totalLaborCost)), 300, aY + 8, { width: 100, align: 'right' });

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#888')
        .text(`Generado: ${new Date().toLocaleString('es-CO')}  |  Estado: ${period.status}`,
          leftX, doc.page.height - 50, { align: 'center', width: 512 });
    });
  }

  // ── Acta de Avance (Certificate) ─────────────────────────────────────────────
  async certificatePdf(cert: any, lines: any[]): Promise<Buffer> {
    return this.build(doc => {
      doc.fontSize(18).font('Helvetica-Bold').text('ACTA DE AVANCE DE OBRA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(`Acta N° ${cert.number}  |  Proyecto: ${cert.project?.name ?? cert.projectId}`, { align: 'center' });
      doc.moveDown(0.5);

      // Header data
      const infoRows: [string, string][] = [
        ['Fecha del Acta:', new Date(cert.certDate).toLocaleDateString('es-CO')],
        ['Estado:', cert.status],
        ['Presupuesto:', cert.budgetId],
        ['Retención garantía:', PCT(cert.retentionPct)],
      ];
      infoRows.forEach(([k, v]) => {
        doc.fontSize(9).font('Helvetica-Bold').text(k, 50);
        doc.moveUp().font('Helvetica').text(v, 220);
      });
      doc.moveDown(1);

      // Lines table
      const headers = ['Descripción', 'Unid.', 'Cant.Ant.', 'Cant.Act.', 'Cant.Acum.', 'V.Unitario', 'Valor Período'];
      const colWidths = [150, 35, 55, 55, 60, 75, 80];
      let x = 50, y = doc.y;

      // Table header
      doc.rect(x, y, 512, 18).fill('#1e3a5f');
      doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold');
      let cx = x + 3;
      headers.forEach((h, i) => {
        doc.text(h, cx, y + 5, { width: colWidths[i] - 4, align: 'center' });
        cx += colWidths[i];
      });
      doc.fillColor('black');
      y += 18;

      lines.forEach((l, idx) => {
        const bg = idx % 2 === 0 ? '#f8f9fa' : 'white';
        doc.rect(x, y, 512, 16).fill(bg);
        doc.fillColor('#222').fontSize(7.5).font('Helvetica');
        cx = x + 3;
        const vals = [
          l.description,
          l.unit,
          Number(l.previousQuantity).toFixed(2),
          Number(l.currentQuantity).toFixed(2),
          Number(l.cumulativeQuantity).toFixed(2),
          COP(Number(l.unitCost)),
          COP(Number(l.currentAmount)),
        ];
        vals.forEach((v, i) => {
          const align = i >= 2 ? 'right' : 'left';
          doc.text(String(v), cx, y + 4, { width: colWidths[i] - 4, align });
          cx += colWidths[i];
        });
        y += 16;
        if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
      });

      // Totals
      y += 10;
      const totals: [string, string][] = [
        ['Valor bruto del acta:', COP(Number(cert.grossAmount))],
        [`Retención garantía (${PCT(cert.retentionPct)}):`, `- ${COP(Number(cert.retentionAmount))}`],
        ['VALOR NETO A PAGAR:', COP(Number(cert.netAmount))],
      ];
      totals.forEach(([k, v], i) => {
        const isBold = i === totals.length - 1;
        doc.rect(x + 280, y, 232, 18).fill(isBold ? '#1e3a5f' : '#f0f0f0');
        doc.fillColor(isBold ? 'white' : '#222').fontSize(9).font(isBold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(k, x + 285, y + 4, { width: 130 });
        doc.text(v, x + 420, y + 4, { width: 85, align: 'right' });
        doc.fillColor('black');
        y += 18;
      });

      y += 16;
      doc.fontSize(9).font('Helvetica-Bold').text('% de ejecución acumulado:', x, y);
      doc.font('Helvetica').text(`${Number(cert.cumulativePct).toFixed(2)}%`, x + 180, y);

      doc.fontSize(8).fillColor('#888')
        .text(`Generado: ${new Date().toLocaleString('es-CO')}`, 50, doc.page.height - 50, { align: 'center', width: 512 });
    });
  }

  // ── Estado de Cuenta — Liquidación ───────────────────────────────────────────
  async liquidationStatement(statement: any): Promise<Buffer> {
    return this.build(doc => {
      const liq     = statement.liquidation;
      const summary = statement.summary;
      const certs   = statement.certificates ?? [];

      doc.fontSize(18).font('Helvetica-Bold').text('ESTADO DE CUENTA — LIQUIDACIÓN DE CONTRATO', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(`Proyecto: ${liq.projectId}  |  Fecha: ${new Date(liq.liquidationDate).toLocaleDateString('es-CO')}`, { align: 'center' });
      doc.moveDown(1);

      // Contract summary
      const contractRows: [string, string][] = [
        ['Valor del contrato:',       COP(summary.contractValue)],
        ['Adiciones:',                COP(summary.additionsValue)],
        ['VALOR TOTAL DEL CONTRATO:', COP(summary.totalContractValue)],
        ['Total ejecutado:',          COP(summary.totalExecuted)],
        ['% Ejecutado:',             `${summary.executedPct}%`],
      ];
      doc.fontSize(10).font('Helvetica-Bold').text('RESUMEN DEL CONTRATO');
      doc.moveDown(0.3);
      contractRows.forEach(([k, v]) => {
        const isBold = k.startsWith('VALOR TOTAL') || k.startsWith('% Ejecutado');
        doc.fontSize(9).font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(k, 60);
        doc.moveUp().text(v, 340, undefined, { align: 'right', width: 170 });
      });
      doc.moveDown(1);

      // Certificates table
      doc.fontSize(10).font('Helvetica-Bold').text('ACTAS DE AVANCE');
      doc.moveDown(0.3);
      const certHeaders = ['Acta N°', 'Fecha', 'Valor Bruto', 'Retención', 'Neto'];
      const certWidths  = [50, 90, 110, 90, 110];
      let cx = 50, cy = doc.y;
      doc.rect(cx, cy, 450, 16).fill('#1e3a5f');
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
      let hx = cx + 3;
      certHeaders.forEach((h, i) => { doc.text(h, hx, cy + 4, { width: certWidths[i] - 4 }); hx += certWidths[i]; });
      doc.fillColor('black');
      cy += 16;
      certs.forEach((c: any, idx: number) => {
        doc.rect(cx, cy, 450, 14).fill(idx % 2 === 0 ? '#f8f9fa' : 'white');
        doc.fillColor('#222').fontSize(8).font('Helvetica');
        hx = cx + 3;
        const row = [
          String(c.number),
          new Date(c.certDate).toLocaleDateString('es-CO'),
          COP(c.grossAmount), COP(c.retentionAmount), COP(c.netAmount),
        ];
        row.forEach((v, i) => {
          doc.text(v, hx, cy + 3, { width: certWidths[i] - 4, align: i > 1 ? 'right' : 'left' });
          hx += certWidths[i];
        });
        cy += 14;
      });
      cy += 14;

      // Deductions
      doc.fontSize(10).font('Helvetica-Bold').text('DEDUCCIONES', 50, cy);
      cy += 18;
      summary.deductions.forEach((d: any) => {
        doc.fontSize(9).font('Helvetica').text(`${d.type} — ${d.description}`, 60, cy);
        doc.text(`- ${COP(d.amount)}`, 380, cy, { width: 120, align: 'right' });
        cy += 14;
      });
      cy += 8;

      // Balance
      const balRows: [string, string, boolean][] = [
        ['Total ejecutado (actas aprobadas):',   COP(summary.totalExecuted),  false],
        ['Menos: retención garantía acumulada:', `- ${COP(summary.totalRetained)}`, false],
        ['Menos: otras deducciones:',            `- ${COP(summary.totalDeductions)}`, false],
        ['SALDO NETO A PAGAR:',                  COP(summary.netBalance),     true],
      ];
      doc.moveTo(50, cy).lineTo(562, cy).lineWidth(1).stroke();
      cy += 8;
      balRows.forEach(([k, v, bold]) => {
        doc.rect(50, cy, 512, 18).fill(bold ? '#1e3a5f' : 'white');
        doc.fillColor(bold ? 'white' : '#222').fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(k, 58, cy + 4, { width: 320 });
        doc.text(v, 380, cy + 4, { width: 160, align: 'right' });
        doc.fillColor('black');
        cy += 18;
      });

      doc.fontSize(8).fillColor('#888')
        .text(`Estado: ${liq.status}  |  Generado: ${new Date().toLocaleString('es-CO')}`,
          50, doc.page.height - 50, { align: 'center', width: 512 });
    });
  }

  /** Draws a rectangle and runs a content callback inside it */
  private _box(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, cb: () => void) {
    doc.rect(x, y, w, h).lineWidth(0.5).stroke('#cccccc');
    cb();
    doc.y = y + h + 4;
  }
}
