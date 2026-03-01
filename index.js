import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

// Функция анализа жалобы только Casper
async function analyzeComplaint(text) {
  const prompt = `
Ты — модератор Casper. Твоя задача максимально человечно оценить жалобу.
- Выбираешь нарушения самостоятельно исходя из текста.
- Стараешься смягчить наказание, если это возможно.
- Объясни, почему выбрал нарушения и наказание.
- Укажи нарушения, баллы и предложенное наказание.

Текст жалобы: "${text}"

Ответ в формате JSON:
{
  "violations": ["..."],
  "points": 0,
  "proposedPunishment": "...",
  "reasoning": "..."
}
`;

  const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt })
  });

  const data = await response.json();
  return data;
}

// Endpoint для анализа жалобы
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста" });

    const result = await analyzeComplaint(text);
    res.json({ analysis: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/", (req, res) => {
  res.send("MAGI Casper server is running");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
