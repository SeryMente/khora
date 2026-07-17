const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getGroqResponse(question: string, systemPromptOverride?: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not configured.");
    return null;
  }

  const url = "https://api.groq.com/openai/v1/chat/completions";

  const defaultSystemPrompt = "Responder en español, <80 palabras, con la opción más simple y reversible que cumpla el Hecho-cuando de la tarjeta documentada en el PR, sin preguntar de vuelta.";
  const systemPrompt = systemPromptOverride || defaultSystemPrompt;

  const body = {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ]
  };

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  };

  const delays = [1000, 2000];
  let attempt = 0;

  while (attempt <= 2) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
      }

      console.error(`Groq API returned status ${response.status} on attempt ${attempt + 1}`);

    } catch (error) {
      console.error(`Error communicating with Groq API on attempt ${attempt + 1}:`, error);
    }

    if (attempt < 2) {
      await delay(delays[attempt]);
    }
    attempt++;
  }

  return null;
}
