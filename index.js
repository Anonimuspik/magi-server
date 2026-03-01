import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

// Сценарий генерации вердикта с обсуждением
async function analyzeComplaint(text) {
  const prompt = `
Ты – модерационная система MAGI с тремя агентами: Casper, Melchior и Balthasar.
- Casper максимально человечный, старается смягчать наказания.
- Melchior оценивает строгость нарушений.
- Balthasar оценивает социальный и эмоциональный вред для сообщества.

Задача:
1. Каждый агент даёт своё мнение о нарушении (может выбрать нарушения самостоятельно, ориентируясь на текст жалобы).
2. Они обсуждают между собой причины и аргументы, спорят или соглашаются.
3. В конце формируют итоговый вердикт, который учитывает мнения всех троих.
4. Указываются:
   - Нарушения
   - Баллы
   - Предлагаемое наказание
   - Причины (с аргументами каждого агента)

Текст жалобы: "${text}"
Ответ должен быть в формате JSON:
{
  "discussion": [
    {"agent": "Casper", "comment": "..."},
    {"agent": "Melchior", "comment": "..."},
    {"agent": "Balthasar", "comment": "..."}
  ],
  "verdict": {
    "violations": ["..."],
    "points": 0,
    "proposedPunishment": "...",
    "reasoning": [
      "Casper: ...",
      "Melchior: ...",
      "Balthasar: ..."
    ]
  }
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

// Endpoint для чата
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
  res.send("MAGI server is running");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
