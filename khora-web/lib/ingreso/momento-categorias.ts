export type CategoriaMomento = 'general' | 'concreta' | 'especializada';

export type TerminoMomento = {
  id: string;
  label: string;
  categoria: CategoriaMomento;
  ejemplos: string[];
};

export const VOCABULARIO_MOMENTO: TerminoMomento[] = [
  // Generales
  { id: 'madrugada', label: 'Madrugada', categoria: 'general', ejemplos: ['madrugada', 'de madrugada'] },
  { id: 'manana', label: 'Mañana', categoria: 'general', ejemplos: ['mañana', 'por la mañana'] },
  { id: 'mediodia', label: 'Mediodía', categoria: 'general', ejemplos: ['mediodía', 'al mediodía'] },
  { id: 'tarde', label: 'Tarde', categoria: 'general', ejemplos: ['tarde', 'por la tarde'] },
  { id: 'noche', label: 'Noche', categoria: 'general', ejemplos: ['noche', 'por la noche'] },

  // Concretas
  { id: 'primera_hora_manana', label: 'A primera hora de la mañana', categoria: 'concreta', ejemplos: ['primera hora'] },
  { id: 'media_manana', label: 'A media mañana', categoria: 'concreta', ejemplos: ['media mañana'] },
  { id: 'hora_almuerzo', label: 'A la hora del almuerzo', categoria: 'concreta', ejemplos: ['almuerzo', 'hora de comer'] },
  { id: 'media_tarde', label: 'A media tarde', categoria: 'concreta', ejemplos: ['media tarde'] },
  { id: 'anochecer', label: 'Al anochecer', categoria: 'concreta', ejemplos: ['anochecer', 'caer la tarde'] },
  { id: 'medianoche', label: 'A la medianoche', categoria: 'concreta', ejemplos: ['medianoche', '12 de la noche'] },

  // Especializadas
  { id: 'hora_dorada', label: 'Hora dorada / Atardecer', categoria: 'especializada', ejemplos: ['hora dorada', 'crepúsculo'] },
  { id: 'hora_azul', label: 'Hora azul', categoria: 'especializada', ejemplos: ['hora azul'] },
  { id: 'cambio_turno', label: 'Cambio de turno', categoria: 'especializada', ejemplos: ['cambio de turno'] },
];

export type EvaluacionSugerenciaIA = {
  sugerida: boolean;
  terminoProuesto: string | null;
  categoriaNorm: CategoriaMomento | null;
  motivo: string;
  condicionCumplida: 1 | 2 | 3 | 4 | null;
};

/**
 * Evaluador de las 4 condiciones de U06-07 para sugerencias de nuevos términos de Momento por parte de la IA.
 */
export function evaluarSugerenciaMomentoIA(
  terminoIA: string,
  categoriaPropuesta: CategoriaMomento | undefined,
  textoContexto: string
): EvaluacionSugerenciaIA {
  const norm = terminoIA.trim().toLowerCase();
  if (!norm) {
    return { sugerida: false, terminoProuesto: null, categoriaNorm: null, motivo: 'Término vacío', condicionCumplida: null };
  }

  // Verificar si ya existe en el vocabulario prediseñado
  const existe = VOCABULARIO_MOMENTO.some(
    t => t.id === norm || t.label.toLowerCase() === norm || t.ejemplos.some(e => e.toLowerCase() === norm)
  );

  // Condición 1: No hay campo adecuado
  const noHayCampoAdecuado = !existe;

  // Condición 2: La propuesta es mejor que los campos prediseñados (aporta especificidad probada)
  const esMejorQuePredisenados = noHayCampoAdecuado && norm.length >= 4;

  // Condición 3: Está debidamente pulido mediante norma a una categoría válida (general, concreta, especializada)
  const categoriaNorm = categoriaPropuesta && ['general', 'concreta', 'especializada'].includes(categoriaPropuesta)
    ? categoriaPropuesta
    : 'concreta';

  // Condición 4: Excepción explícita donde la IA identificó un término claramente adecuado sin coincidir con regla estándar
  const esExcepcionValida = !existe && textoContexto.toLowerCase().includes(norm);

  if (noHayCampoAdecuado && esMejorQuePredisenados) {
    return {
      sugerida: true,
      terminoProuesto: terminoIA,
      categoriaNorm,
      motivo: 'Propuesta aceptada por Condiciones 1, 2 y 3 (término no existente, mayor especificidad y categoría normalizada).',
      condicionCumplida: 3,
    };
  }

  if (esExcepcionValida) {
    return {
      sugerida: true,
      terminoProuesto: terminoIA,
      categoriaNorm: 'especializada',
      motivo: 'Propuesta aceptada por Condición 4 (Excepción identificada claramente en el contexto).',
      condicionCumplida: 4,
    };
  }

  return {
    sugerida: false,
    terminoProuesto: null,
    categoriaNorm: null,
    motivo: 'El término ya existe o no cumple las condiciones de especificidad o contexto.',
    condicionCumplida: null,
  };
}
