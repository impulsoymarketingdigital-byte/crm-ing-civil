export interface StockValuationLine {
  inventoryItemId: string;
  sku: string;
  name: string;
  type: string;
  unitOfMeasure: string;
  quantityOnHand: string;
  weightedAverageCost: string;
  totalValue: string;
  reorderPoint: string;
  belowReorder: boolean;
}

export interface StockValuationReport {
  tenantId: string;
  generatedAt: string;
  lines: StockValuationLine[];
  totals: {
    totalItems: number;
    itemsBelowReorder: number;
    totalInventoryValue: string;
  };
}
