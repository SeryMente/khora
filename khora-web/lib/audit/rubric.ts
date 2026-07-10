export interface RubricItem {
  id: number;
  descripcion: string;
  capa: "deterministico" | "semantico";
}

export const rubric: { version: string; items: RubricItem[] } = {
  version: "v1",
  items: [
    {
      id: 1,
      descripcion: "Objetivo Único: ¿Se define un único objetivo claro y delimitado sin subtareas ambiguas?",
      capa: "deterministico"
    },
    {
      id: 2,
      descripcion: "Alcance Explícito (Sí/No): ¿Se detallan explícitamente los archivos/módulos a tocar y los que no se deben tocar?",
      capa: "deterministico"
    },
    {
      id: 3,
      descripcion: "Rama de Trabajo: ¿Se especifica correctamente la rama base y la rama destino?",
      capa: "deterministico"
    },
    {
      id: 4,
      descripcion: "Ausencia de Alucinación/Simulación: ¿La solución requerida evita mockups, esperas artificiales y estubs?",
      capa: "semantico"
    },
    {
      id: 5,
      descripcion: "Impacto Colateral Analizado: ¿Se previene la regresión de funcionalidades existentes?",
      capa: "semantico"
    },
    {
      id: 6,
      descripcion: "Contrato de Salida: ¿Se especifica el formato esperado del PR (título y commit trailer)?",
      capa: "deterministico"
    },
    {
      id: 7,
      descripcion: "Seguridad y Privacidad: ¿Se respeta la política estricta de no loguear credenciales o PII?",
      capa: "semantico"
    },
    {
      id: 8,
      descripcion: "Dependencias: ¿Se evita introducir nuevas dependencias de terceros si es posible usar APIs nativas?",
      capa: "semantico"
    },
    {
      id: 9,
      descripcion: "Estilo y Convenciones: ¿El código pedido cumple con la arquitectura estipulada (ej. shell architecture, no ORM)?",
      capa: "semantico"
    },
    {
      id: 10,
      descripcion: "Trazabilidad Completa: ¿El prompt contiene el Task ID, Bloque P283, Firma P286 y versión de rúbrica?",
      capa: "deterministico"
    }
  ]
};
