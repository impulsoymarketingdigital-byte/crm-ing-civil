import { Injectable, Logger } from '@nestjs/common';
import { SecopSearchDto } from '../domain/dto/secop-search.dto';

/**
 * SECOP II — Colombia Compra Eficiente
 * Queries the public SOCRATA API (datos.gov.co) for procurement processes.
 * Dataset: Procesos de Contratación SECOP II
 * Endpoint: https://www.datos.gov.co/resource/p6dx-8zbt.json
 *
 * No API key required for public data (rate-limited to 1000 req/hour per IP).
 */
const SECOP_II_URL = 'https://www.datos.gov.co/resource/p6dx-8zbt.json';
const APP_TOKEN    = '';          // Optional Socrata app token for higher rate limits

export interface SecopProcess {
  numeroProcesoSeleccion: string;
  entidadNombre:          string;
  descripcion:            string;
  valorEstimado:          number | null;
  valorContrato:          number | null;
  estadoProcesoSeleccion: string;
  modalidad:              string;
  fechaPublicacion:       string | null;
  fechaAdjudicacion:      string | null;
  departamento:           string;
  municipio:              string;
  urlProceso:             string;
}

export interface SecopSearchResult {
  total:     number;
  page:      number;
  limit:     number;
  results:   SecopProcess[];
  keyword:   string;
  source:    string;
}

@Injectable()
export class SecopService {
  private readonly logger = new Logger(SecopService.name);

  async search(dto: SecopSearchDto): Promise<SecopSearchResult> {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 10;
    const offset = (page - 1) * limit;

    // Build SoQL WHERE clause
    const conditions: string[] = [];

    if (dto.keyword) {
      // Full-text search across descripcion and nombre entidad
      const kw = dto.keyword.replace(/'/g, "''").toUpperCase();
      conditions.push(
        `(upper(descripcion_del_proceso) like '%${kw}%' OR upper(nombre_entidad) like '%${kw}%')`
      );
    }
    if (dto.entity) {
      const ent = dto.entity.replace(/'/g, "''").toUpperCase();
      conditions.push(`upper(nombre_entidad) like '%${ent}%'`);
    }
    if (dto.status) {
      conditions.push(`estado_del_proceso='${dto.status.replace(/'/g, "''")}'`);
    }

    const where  = conditions.length ? `$where=${encodeURIComponent(conditions.join(' AND '))}` : '';
    const params = [
      where,
      `$limit=${limit}`,
      `$offset=${offset}`,
      `$order=fecha_de_publicacion_del DESC`,
      APP_TOKEN ? `$$app_token=${APP_TOKEN}` : '',
    ].filter(Boolean).join('&');

    const url = `${SECOP_II_URL}?${params}`;
    this.logger.debug(`SECOP query: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': APP_TOKEN || undefined as any,
      },
    });

    if (!response.ok) {
      this.logger.error(`SECOP API error: ${response.status} ${response.statusText}`);
      return this._fallbackResult(dto.keyword, page, limit);
    }

    const raw: any[] = await response.json();

    const results: SecopProcess[] = raw.map(r => ({
      numeroProcesoSeleccion: r.numero_de_proceso             ?? r.referencia_del_proceso ?? '-',
      entidadNombre:          r.nombre_entidad                ?? '-',
      descripcion:            r.descripcion_del_proceso       ?? r.objeto_a_contratar     ?? '-',
      valorEstimado:          r.precio_base      != null ? Number(r.precio_base)      : null,
      valorContrato:          r.valor_del_contrato != null ? Number(r.valor_del_contrato) : null,
      estadoProcesoSeleccion: r.estado_del_proceso            ?? '-',
      modalidad:              r.modalidad_de_contratacion     ?? '-',
      fechaPublicacion:       r.fecha_de_publicacion_del      ?? null,
      fechaAdjudicacion:      r.fecha_de_adjudicacion         ?? null,
      departamento:           r.departamento_entidad          ?? '-',
      municipio:              r.ciudad_entidad                ?? '-',
      urlProceso:             r.urlproceso ?? r.link_al_proceso ?? '',
    }));

    return {
      total:   results.length < limit ? offset + results.length : offset + limit + 1,
      page,
      limit,
      results,
      keyword: dto.keyword,
      source:  'SECOP II — Colombia Compra Eficiente (datos.gov.co)',
    };
  }

  /** Returns a structured error result when the API is unreachable */
  private _fallbackResult(keyword: string, page: number, limit: number): SecopSearchResult {
    return {
      total:   0, page, limit, results: [], keyword,
      source:  'SECOP II (API no disponible — verifique conectividad)',
    };
  }

  /** Returns the latest published processes (no filter) */
  async latest(limit = 20): Promise<SecopSearchResult> {
    return this.search({ keyword: '', limit, page: 1 });
  }

  /** Returns processes filtered for civil engineering / infrastructure keywords */
  async infrastructureSearch(keyword: string, page = 1): Promise<SecopSearchResult> {
    const infraKeywords = [
      keyword,
      'CONSTRUCCIÓN', 'OBRA CIVIL', 'INFRAESTRUCTURA', 'PUENTE', 'VÍA',
    ].filter(Boolean).join(' ');
    return this.search({ keyword: infraKeywords, page, limit: 10 });
  }
}
