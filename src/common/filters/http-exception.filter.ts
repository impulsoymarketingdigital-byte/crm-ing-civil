import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    this.logger.error(exception);

    // Format and translate message
    let message: any;
    let error = 'Error';

    if (typeof rawResponse === 'string') {
      message = this.translateMessage(rawResponse);
    } else if (typeof rawResponse === 'object' && rawResponse !== null) {
      const obj = rawResponse as any;
      error = obj.error || 'Error';
      if (Array.isArray(obj.message)) {
        message = obj.message.map((msg: string) => this.translateMessage(msg));
      } else {
        message = this.translateMessage(obj.message || 'Error del servidor');
      }
    } else {
      message = 'Error interno del servidor';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: this.translateMessage(error),
      timestamp: new Date().toISOString(),
    });
  }

  private translateMessage(msg: string): string {
    if (!msg || typeof msg !== 'string') return msg;

    const exactTranslations: Record<string, string> = {
      'Internal server error': 'Error interno del servidor',
      'Forbidden resource': 'Acceso denegado',
      'Unauthorized': 'No autorizado',
      'Tenant context missing': 'Falta el contexto del inquilino (tenantId)',
      'Project not found': 'Proyecto no encontrado',
      'Employee not found': 'Empleado no encontrado',
      'Account not found': 'Cuenta no encontrada',
      'Budget not found': 'Presupuesto no encontrado',
      'Certificate not found': 'Acta de avance no encontrada',
      'Invoice not found': 'Factura no encontrada',
      'Vendor not found': 'Proveedor no encontrado',
      'User not found': 'Usuario no encontrado',
      'Role not found': 'Rol no encontrado',
      'Customer not found': 'Cliente no encontrado',
      'Inventory item not found': 'Artículo de inventario no encontrado',
      'Journal entry not found': 'Asiento contable no encontrado',
      'Line not found': 'Línea no encontrada',
      'Input not found': 'Insumo no encontrado',
      'APU item not found': 'Ítem APU no encontrado',
      'APU chapter not found': 'Capítulo APU no encontrado',
      'Chapter not found': 'Capítulo no encontrado',
      'Only DRAFT entries can be posted': 'Solo se pueden contabilizar asientos en estado BORRADOR (DRAFT)',
      'Entry is already VOIDED': 'El asiento contable ya está anulado',
      'Only POSTED entries can be voided': 'Solo se pueden anular asientos contables contabilizados (POSTED)',
      'AI service is temporarily unavailable': 'El servicio de IA no está disponible temporalmente',
      'Cannot modify an approved budget — create a new version': 'No se puede modificar un presupuesto aprobado — cree una nueva versión',
      'Cannot modify an approved budget': 'No se puede modificar un presupuesto aprobado',
      'Only DRAFT or SUBMITTED certificates can be approved': 'Solo se pueden aprobar actas en estado BORRADOR o PRESENTADA',
      'Bad Request': 'Solicitud incorrecta',
      'Forbidden': 'Prohibido',
      'Conflict': 'Conflicto',
      'Unprocessable Entity': 'Entidad no procesable',
      'Not Found': 'No encontrado',
      'UnauthorizedException': 'No autorizado',
      'Service Unavailable': 'Servicio no disponible',
    };

    if (exactTranslations[msg]) {
      return exactTranslations[msg];
    }

    let translated = msg;

    // Validation patterns from class-validator
    translated = translated.replace(/\b(must be an email|must be a valid email)\b/gi, 'debe ser un correo electrónico válido');
    translated = translated.replace(/\bmust be a string\b/gi, 'debe ser una cadena de texto');
    translated = translated.replace(/\bmust be a number\b/gi, 'debe ser un número');
    translated = translated.replace(/\bmust be a boolean\b/gi, 'debe ser un valor booleano');
    translated = translated.replace(/\bmust be a UUID\b/gi, 'debe ser un UUID válido');
    translated = translated.replace(/\bmust be a date\b/gi, 'debe ser una fecha válida');
    translated = translated.replace(/\bshould not be empty\b/gi, 'no debe estar vacío');
    translated = translated.replace(/\bmust be longer than or equal to (\d+) characters\b/gi, 'debe tener al menos $1 caracteres');
    translated = translated.replace(/\bmust be shorter than or equal to (\d+) characters\b/gi, 'debe tener como máximo $1 caracteres');
    translated = translated.replace(/\bmust be a valid representation of\b/gi, 'debe ser una representación válida de');

    // Dynamic database and conflict patterns
    if (translated.includes('already exists')) {
      translated = translated.replace(/code "([^"]+)" already exists/i, 'código "$1" ya existe');
      translated = translated.replace(/Reference "([^"]+)" already exists/i, 'La referencia "$1" ya existe');
      translated = translated.replace(/SKU "([^"]+)" already exists/i, 'El SKU "$1" ya existe');
      translated = translated.replace(/Employee code "([^"]+)" already exists/i, 'El código de empleado "$1" ya existe');
      translated = translated.replace(/already exists/i, 'ya existe');
    }

    if (translated.includes('not found or inactive')) {
      translated = translated.replace(/Accounts not found or inactive in this tenant: (.*)/i, 'Cuentas no encontradas o inactivas en este inquilino: $1');
    }

    return translated;
  }
}
