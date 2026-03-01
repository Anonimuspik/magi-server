import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const HF_TOKEN = process.env.HF_TOKEN; // Hugging Face токен
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"; // модель

// Правила чата
const rules = [
  { name: "Ссоры", points: 1, punishment: { mute: 10, warn: 0 }, description: "Конфликты между участниками." },
  { name: "Оскорбления", points: 2, punishment: { mute: 15, warn: 0 }, description: "Оскорбления участников, кроме родных." },
  { name: "Нарушение личных границ", points: 1, punishment: { mute: 10, warn: 0 }, description: "Распространение личной информации без разрешения." },
  { name: "Пропаганда и реклама", points: 2, punishment: { mute: 30, warn: 0 }, description: "Реклама, 18+, пропаганда насилия." },
  { name: "Недостоверная информация", points: 1, punishment: { mute: 10, warn: 0 }, description: "Фейки, клевета, ложные обвинения." },
  { name: "Неприемлемый контент", points: 3, punishment: { mute: 60, warn: 0 }, description: "18+, жестокость, запрещенные фото/гиф." },
  { name: "Упоминание родных", points: 2, punishment: { mute: 0, warn: 1 }, description: "Оскорбления родственников." }
];

// Endpoint для анализа жалобы
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста для анализа" });

    // Создаем промпт для Каспера
    const finalPrompt = `
Ты - Каспер, искусственный модератор чата. 
Твоя задача:
1. Определить нарушения в сообщении по правилам:
${rules.map(r => `- ${r.name}: ${r.description}`).join("\n")}
2. Выдать количество баллов.
3. Предложить наказание максимально мягко (муты и варны).
4. Дать reasoning (почему так решил).

Сообщение для анализа:
"${text}"

Ответь строго в JSON формате:
{
  "lastComplaint": "<сообщение>",
  "violations": ["нарушения"],
  "points": <число>,
  "proposedPunishment": { "muteMinutes": <число>, "warnings": <число> },
  "reasoning": ["<Casper объяснил>", "..."]
}
`;

    const response = await fetch(`https://router.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: finalPrompt,
        parameters: { max_new_tokens: 500 }
      })
    });

    const data = await response.json();

    // Возвращаем результат JSON
    res.json({ analysis: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера или соединения с Hugging Face", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("MAGI server is running");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
