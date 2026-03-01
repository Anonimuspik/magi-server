import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN; // Твой Hugging Face токен
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

// Casper — человечный мозг
async function casperAnalyze(text) {
  // Подготовим prompt
  const finalPrompt = `
Ты — Casper, самый человечный модератор чата. Твоя задача:
- Определить нарушения, если они есть.
- Выставлять наказания мягче, чем обычно.
- Объяснять в "Причинах", почему наказание минимальное.
- Баллы ставь не больше реальной опасности/грубой силы фразы.

Текст жалобы: "${text}"
Выведи JSON:
{
  "нарушения": ["пример"],
  "баллы": число,
  "предлагаемое_наказание": ["пример"],
  "причина": "развёрнутый текст, аргументы Casper"
}
`;

  const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: finalPrompt })
  });

  const data = await response.json();
  // Модель возвращает текст в data[0].generated_text или data.generated_text
  const resultText = data?.[0]?.generated_text || data?.generated_text || "";
  try {
    // Попытка распарсить JSON из текста модели
    const jsonStart = resultText.indexOf("{");
    const jsonEnd = resultText.lastIndexOf("}") + 1;
    const jsonString = resultText.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonString);
  } catch {
    return { error: "Не удалось распарсить ответ модели", raw: resultText };
  }
}

// Endpoint для анализа жалобы
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста" });

    const analysis = await casperAnalyze(text);
    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/", (req, res) => {
  res.send("MAGI server is running. Use POST /analyze with {text}.");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
