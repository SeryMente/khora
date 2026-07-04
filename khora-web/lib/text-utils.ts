export function normalizeDictatedText(text: string): string {
    if (!text) return text;
    
    // Capitalize first letter of string
    let normalized = text.charAt(0).toUpperCase() + text.slice(1);
    
    // Basic punctuation replacements (Spanish)
    normalized = normalized.replace(/\s+punto\s+/gi, ". ");
    normalized = normalized.replace(/\s+coma\s+/gi, ", ");
    normalized = normalized.replace(/\s+nueva l[íi]nea\s+/gi, "\n\n");
    
    // Sometimes dictation puts space before punctuation
    normalized = normalized.replace(/\s+\./g, ".");
    normalized = normalized.replace(/\s+,/g, ",");
    
    // Capitalize after period
    normalized = normalized.replace(/\.\s+([a-zñáéíóú])/g, (match, letter) => {
        return ". " + letter.toUpperCase();
    });

    return normalized;
}
