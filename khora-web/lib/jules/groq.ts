export async function getGroqResponse(question: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not configured.");
    return null;
  }

  const url = "https://api.groq.com/openai/v1/chat/completions";

  const systemPrompt = "Responder en español, <80 palabras, con la opción más simple y reversible que cumpla el Hecho-cuando de la tarjeta documentada en el PR, sin preguntar de vuelta.";

  const body = {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error(`Groq API returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Error communicating with Groq API:", error);
    return null;
  }
}
