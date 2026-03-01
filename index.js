import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Настройки
const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;

// Системная инструкция для анализа жалоб
const systemPrompt = `
Ты — анализатор жалоб для чата RcSoulsFlood.
У тебя есть правила:

Ссоры: мут 1 час + 1 пред.
Оскорбления: мут 1 час + 2 преда (взаимные + родные оскорбления).
Нарушение личных границ: пред + мут 2 часа (иногда бан).
Пропаганда/реклама/18+: пред + мут 2 часа.
Недостоверная информация/клевета: мут 2 часа.
Нарушение дисциплины: 2 преда.
Провокации: пред.
Спам (>10 одинаковых сообщений): мут 30 мин.
Неприемлемый контент (18+, расчленёнка): 2 преда + мут 1 час.
Калл без разрешения: запрещён.

Проанализируй текст жалобы и верни строго в формате:
Нарушения: ...
Баллы: ...
Предлагаемое наказание: ...
Причина: ...
`;

// Главная точка — проверка сервера
app.get("/", (req, res) => {
  res.send("MAGI server is running");
});

// Анализ жалобы через Hugging Face chat API
app.post("/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Нет текста." });
  }

  try {
    // Формируем запрос к chat/completions
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    // Возвращаем модельный ответ
    res.json({ result: data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера анализа." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
