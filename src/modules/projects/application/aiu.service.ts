import { Injectable } from '@nestjs/common';

export interface AiuResult {
  contractValue: number;
  adminPct: number;
  riskPct: number;
  profitPct: number;
  adminAmount: number;
  riskAmount: number;
  profitAmount: number;
  aiuAmount: number;
  totalValue: number;
}

@Injectable()
export class AiuService {
  calculate(
    contractValue: number,
    adminPct: number,
    riskPct: number,
    profitPct: number,
  ): AiuResult {
    const adminAmount = contractValue * adminPct;
    const riskAmount = contractValue * riskPct;
    const profitAmount = contractValue * profitPct;
    const aiuAmount = adminAmount + riskAmount + profitAmount;
    const totalValue = contractValue + aiuAmount;

    return {
      contractValue,
      adminPct,
      riskPct,
      profitPct,
      adminAmount,
      riskAmount,
      profitAmount,
      aiuAmount,
      totalValue,
    };
  }
}
