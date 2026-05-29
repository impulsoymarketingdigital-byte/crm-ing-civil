import { Prisma } from '@prisma/client';

/**
 * Thin wrapper around Prisma.Decimal (decimal.js) that provides
 * the precise arithmetic used throughout the ledger domain.
 *
 * Always convert JS floats via `.toString()` before constructing
 * a Decimal to avoid the IEEE-754 representation artifact:
 *   new Prisma.Decimal(0.1 + 0.2) → "0.30000000000000004"  ← wrong
 *   new Prisma.Decimal("0.1").add("0.2")                   → "0.3"  ← correct
 */
export class DecimalMoney {
  static from(value: number | string | Prisma.Decimal): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) return value;
    return new Prisma.Decimal(value.toString());
  }

  static ZERO = new Prisma.Decimal(0);

  static sum(values: (number | string | Prisma.Decimal)[]): Prisma.Decimal {
    return values.reduce<Prisma.Decimal>(
      (acc, v) => acc.add(DecimalMoney.from(v)),
      DecimalMoney.ZERO,
    );
  }
}
