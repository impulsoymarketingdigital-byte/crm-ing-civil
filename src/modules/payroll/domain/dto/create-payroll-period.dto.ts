import { IsString, IsInt, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsString() employeeId: string;
  @IsInt() @Min(2020) @Max(2099) year: number;
  @IsInt() @Min(1) @Max(12) month: number;
  /** 0 = mensual completo, 1 = primera quincena, 2 = segunda quincena */
  @IsOptional() @IsIn([0, 1, 2]) fortnight?: number;

  // Horas extra (valores en pesos COP ya calculados externamente, o 0)
  @IsOptional() @IsNumber() @Min(0) overtimeDayPct25?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeNightPct75?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeHolidayPct75?: number;
  @IsOptional() @IsNumber() @Min(0) overtimeHolidayPct100?: number;
  @IsOptional() @IsNumber() @Min(0) bonuses?: number;
  @IsOptional() @IsNumber() @Min(0) incomeTax?: number;
  @IsOptional() @IsNumber() @Min(0) otherDeductions?: number;
  @IsOptional() @IsString() notes?: string;
}
