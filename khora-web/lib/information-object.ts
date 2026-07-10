/**
 * Módulo: InformationObject Contract
 * Tarjeta: [URL_TARJETA_J1]
 *
 * Este contrato define el Objeto de Información ι = (σ, µ, c) del Constructor §4 de EpisTwin.
 *
 * AFLUENTES EMISORES:
 * Bitácora, Cabina OPI/VRI y Harmonia son los tres afluentes que deben implementar
 * este contrato como emisores.
 */

/**
 * Representa el origen o fuente de la información (σ)
 */
export type Source = string;

/**
 * Representa los metadatos asociados a la información (µ)
 */
export interface Metadata {
  /** Fecha y hora de creación/captura en formato ISO 8601 */
  timestamp: string;
  /** Otros metadatos específicos del emisor o del contexto */
  [key: string]: unknown;
}

/**
 * Representa el contenido en sí de la información (c)
 */
export type Content = unknown;

/**
 * Objeto de Información ι = (σ, µ, c) del Constructor §4 de EpisTwin.
 */
export interface InformationObject {
  /**
   * Identificador único del objeto de información.
   */
  id: string;

  /**
   * Fuente o emisor (σ) del objeto. Ej: 'bitacora', 'cabina-vri', 'harmonia'.
   */
  source: Source;

  /**
   * Metadatos (µ) del objeto de información.
   */
  metadata: Metadata;

  /**
   * Contenido bruto o procesado (c) del objeto.
   */
  content: Content;
}
