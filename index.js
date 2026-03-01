import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;

const systemPrompt = `
Ты — модератор чата RcSoulsFlood. Твоя задача:
Проанализировать жалобу по правилам чата и выдать:
Нарушения:
Баллы:
Предлагаемое наказание:
Причина:

Правила:
Ссоры: мут 1 час + 1 пред.
Оскорбления: мут 1 час + 2 преда.
Нарушение личных границ: пред + мут 2 часа (иногда бан).
Пропаганда/реклама/18+: пред + мут 2 часа.
Недостоверная информация: мут 2 часа.
Нарушение дисциплины: 2 преда.
Провокации: пред.
Спам (>10 одинаковых): мут 30 минут.
Неприемлемый контент (18+, расчленёнка): 2 преда + мут 1 час.
Калл без разрешения: запрещён.
`;

app.get("/", (req, res) => {
  res.send("MAGI server is running");
});

app.post("/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Нет текста для анализа" });

  try {
    const apiRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.1-8B-Instruct:cerebras",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(apiRes.status).json({ error: errText });
    }

    const data = await apiRes.json();

    let answer = "";
    if (data.choices && data.choices[0] && data.choices[0].message) {
      answer = data.choices[0].message.content.trim();
    }

    return res.json({ analysis: answer });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Ошибка анализа на сервере" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
