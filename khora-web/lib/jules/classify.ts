export function isSimpleQuestion(question: string): boolean {
  if (!question) return true; // Empty question isn't complex for our purposes

  const lw = question.toLowerCase();
  const kw = [
    "apruebas",
    "apruebo",
    "procedo",
    "continuo",
    "confirmar",
    "autorizas",
    "de acuerdo",
    "ok",
    "si/no",
    "correcto"
  ];

  const hasKeyword = kw.some(k => lw.includes(k));
  return hasKeyword && question.length < 260;
}
