import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

// Упрощённые правила чата
const rules = [
  { name: "Ссоры", points: 1, punishment: "мут 15–60 минут", desc: "Начало или продолжение конфликта в чате" },
  { name: "Оскорбления", points: 2, punishment: "мут 15–60 минут", desc: "Оскорбления участников чата" },
  { name: "Оскорбления родственников", points: 2, punishment: "мут 15–60 минут + 1 варн", desc: "Оскорбления в адрес родных" },
  { name: "Нарушение личных границ", points: 2, punishment: "мут 30–120 минут", desc: "Распространение личной информации без разрешения" },
  { name: "Пропаганда и реклама", points: 2, punishment: "мут 30–120 минут", desc: "Сообщения с насилием, 18+, рекламой сайтов" },
  { name: "Недостоверная информация", points: 1, punishment: "мут 15–60 минут", desc: "Ложные обвинения, фейки, клевета" },
  { name: "Нарушение дисциплины", points: 2, punishment: "мут 30–60 минут", desc: "Выдача себя за другого человека или администрацию" },
  { name: "Провокации", points: 1, punishment: "мут 15–30 минут", desc: "Подталкивание к нарушению правил" },
  { name: "Спам", points: 1, punishment: "мут 15–30 минут", desc: "Более 10 одинаковых сообщений/стикеров/GIF подряд" },
];

app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста" });

    // Формируем промпт для Hugging Face
    const finalPrompt = `
Ты — Casper, максимально человечный модератор. 
Проанализируй следующую жалобу по правилам чата (см. список ниже). 
Выбери, какие нарушения имеют место, начисли баллы и предложи наказание. 
Если есть возможность, смягчи наказание.
Объясни в "reasoning", почему ты так решил.
Текст жалобы: "${text}"

Правила чата:
${rules.map(r => `${r.name}: ${r.desc} (баллы: ${r.points}, наказание: ${r.punishment})`).join("\n")}

Формат ответа JSON:
{
  "lastComplaint": "<текст жалобы>",
  "violations": ["<список нарушений>"],
  "points": <число>,
  "proposedPunishment": {
    "muteMinutes": <число>,
    "warnings": <число>
  },
  "reasoning": [
    "Casper объяснил ...",
    "Casper отметил ..."
  ]
}
`;

    // Запрос к Hugging Face
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: finalPrompt })
    });

    const data = await response.json();
    res.json({ analysis: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(PORT, () => console.log(`MAGI server running on port ${PORT}`));
