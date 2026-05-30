/** Colombian labor constants (2025 values) */
export const SMMLV_2025 = 1_423_500; // Salario Mínimo Mensual Legal Vigente
export const TRANSPORT_ALLOWANCE_2025 = 200_000; // Auxilio de transporte
export const TRANSPORT_THRESHOLD = SMMLV_2025 * 2; // ≤ 2 SMMLV

/** Employee contributions (% of devengado) */
export const HEALTH_EMPLOYEE_PCT = 0.04;
export const PENSION_EMPLOYEE_PCT = 0.04;

/** Employer contributions (% of devengado) */
export const HEALTH_EMPLOYER_PCT = 0.085;
export const PENSION_EMPLOYER_PCT = 0.12;
export const SENA_PCT = 0.02;
export const ICBF_PCT = 0.03;
export const COMPENSATION_BOX_PCT = 0.04;

/** ARL risk levels */
export const ARL_RATES: Record<string, number> = {
  I:   0.00522,
  II:  0.01044,
  III: 0.02436,
  IV:  0.04350,
  V:   0.06960,
};

/** Social benefits as monthly accrual rates */
export const PRIMA_MONTHLY_PCT     = 1 / 12;      // 1 month/year → ~8.33%
export const CESANTIAS_MONTHLY_PCT = 1 / 12;      // 1 month/year → ~8.33%
export const CESANTIAS_INTEREST_MONTHLY_PCT = 0.12 / 12; // 12% annual / 12
export const VACACIONES_MONTHLY_PCT = 0.5 / 12;   // 15 days/year → ~4.17%
