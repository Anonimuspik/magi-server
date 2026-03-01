import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;

// Твоя подробная системная инструкция
const systemPrompt = `
Ты — модератор чата RcSoulsFlood. Твоя задача — анализировать жалобы
по правилам чата и давать структурированный ответ:

Правила:
Ссоры: мут 1ч + 1пред.
Оскорбления: мут 1ч + 2преда.
Нарушение личных границ: пред + мут 2ч/бан.
Пропаганда/реклама/18+: пред + мут 2ч.
Недостоверная информация: мут 2ч.
Нарушение дисциплины: 2преда.
Провокации: пред.
Спам: мут 30 мин.
Неприемлемый контент (18+, расчленёнка): 2преда + мут 1ч.
Калл без разрешения: запрещён.

Проанализируй жалобу и верни строго в таком виде:

Нарушения:
Баллы:
Предлагаемое наказание:
Причина:
`;

app.get("/", (req, res) => {
  res.send("MAGI server is running");
});

app.post("/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Нет текста для анализа" });

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-R1:fastest", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: text }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();

    // Модель возвращает текст в choices[0].message.content
    let answer = "";
    if (data.choices && data.choices[0] && data.choices[0].message) {
      answer = data.choices[0].message.content.trim();
    }

    return res.json({ analysis: answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка анализа на сервере" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
