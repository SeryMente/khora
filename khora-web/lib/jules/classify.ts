export function isSimpleQuestion(question: string): boolean {
  if (!question) return true; // Empty question isn't complex for our purposes

  const lw = question.toLowerCase();
  const kw: string[] = [
    // Palabras de aprobación eliminadas por regla de negocio
    // Ahora las peticiones de aprobación ("apruebas", "ok", "confirmar", "procedo")
    // pasan a ser respondidas con contexto total de la tarjeta
  ];

  const hasKeyword = kw.some(k => lw.includes(k));
  return hasKeyword && question.length < 260;
}
