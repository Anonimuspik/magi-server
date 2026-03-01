import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN; // твой Hugging Face токен
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"; // модель

// Правила Casper
const rules = [
  {
    name: "Оскорбления",
    points: 1,
    maxMutes: 15,
    explanation: "Любые фразы, направленные на конкретного человека, которые могут задеть его эмоции."
  },
  {
    name: "Нарушение личных границ",
    points: 1,
    maxMutes: 10,
    explanation: "Распространение информации или высказываний, которые могут задеть участника."
  },
  {
    name: "Провокации",
    points: 1,
    maxMutes: 10,
    explanation: "Любые фразы, направленные на то, чтобы вызвать ссору или конфликт."
  },
  {
    name: "Ссоры / Конфликты",
    points: 1,
    maxMutes: 15,
    explanation: "Продолжение спора после предупреждений."
  }
];

// Endpoint для анализа жалобы
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста" });

    // Формируем prompt для модели
    const prompt = `
Ты - модератор Casper. Твоя задача: мягко анализировать жалобы в чате, выявлять нарушения, давать баллы и предлагать наказание. 
Следуй правилам:
${rules.map(r => `- ${r.name}: максимум мут ${r.maxMutes} минут, баллы ${r.points}. ${r.explanation}`).join("\n")}

Жалоба: "${text}"

Дай результат в формате:

Нарушения:
- <перечисли нарушения>

Баллы: <сумма баллов>

Предлагаемое наказание:
- Мут X минут
- Y предупреждений (только при необходимости)

Причина:
- Объясни каждое нарушение, почему так оценил, и как смягчил наказание.
`;

    // Запрос к Hugging Face API
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const data = await response.json();

    if (!data || !data[0] || !data[0].generated_text) {
      return res.status(500).json({ error: "Сервер не вернул анализ." });
    }

    res.json({ analysis: data[0].generated_text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(PORT, () => console.log(`MAGI Casper server running on port ${PORT}`));
