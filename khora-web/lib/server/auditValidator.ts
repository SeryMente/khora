import { rubric } from '../audit/rubric';

export interface DraftInstruction {
  objetivo?: string;
  alcance?: {
    tocar?: string[];
    no_tocar?: string[];
  };
  rama?: {
    base?: string;
    destino?: string;
  };
  contrato_salida?: {
    titulo?: string;
    commit_trailer?: string;
  };
  trazabilidad?: {
    tarea_id?: string;
    bloque_p283?: boolean;
    firma_p286?: boolean;
    rubrica_version?: string;
  };
}

export interface ValidationResult {
  id: number;
  pass: boolean | null;
  motivo: string;
}

export function validateDraft(draft: DraftInstruction): ValidationResult[] {
  return rubric.items.map((item) => {
    if (item.capa === 'semantico') {
      return {
        id: item.id,
        pass: null,
        motivo: "no_evaluado_aqui — capa semántica exclusiva de Samantha"
      };
    }

    let pass = false;
    let motivo = "";

    switch (item.id) {
      case 1:
        pass = typeof draft?.objetivo === 'string' && draft.objetivo.trim().length > 0;
        motivo = pass ? "Objetivo presente y válido." : "Falta el campo 'objetivo' o está vacío.";
        break;
      case 2:
        pass = Array.isArray(draft?.alcance?.tocar) && Array.isArray(draft?.alcance?.no_tocar);
        motivo = pass ? "Alcance con arrays 'tocar' y 'no_tocar' válido." : "El campo 'alcance' requiere los arrays 'tocar' y 'no_tocar'.";
        break;
      case 3:
        pass = typeof draft?.rama?.base === 'string' && draft.rama.base.trim().length > 0 &&
               typeof draft?.rama?.destino === 'string' && draft.rama.destino.trim().length > 0;
        motivo = pass ? "Rama base y destino especificadas correctamente." : "Falta 'rama.base' o 'rama.destino' válidas.";
        break;
      case 6:
        pass = typeof draft?.contrato_salida?.titulo === 'string' && draft.contrato_salida.titulo.trim().length > 0 &&
               typeof draft?.contrato_salida?.commit_trailer === 'string' && draft.contrato_salida.commit_trailer.trim().length > 0;
        motivo = pass ? "Contrato de salida estructurado correctamente." : "Falta 'contrato_salida.titulo' o 'contrato_salida.commit_trailer'.";
        break;
      case 10:
        pass = typeof draft?.trazabilidad?.tarea_id === 'string' && draft.trazabilidad.tarea_id.trim().length > 0 &&
               draft?.trazabilidad?.bloque_p283 === true &&
               draft?.trazabilidad?.firma_p286 === true &&
               typeof draft?.trazabilidad?.rubrica_version === 'string' && draft.trazabilidad.rubrica_version.trim().length > 0;
        motivo = pass ? "Trazabilidad completa verificada." : "Estructura de trazabilidad incompleta o inválida (se requieren strings y los booleanos en true).";
        break;
      default:
        motivo = "Ítem desconocido.";
    }

    return {
      id: item.id,
      pass,
      motivo
    };
  });
}
