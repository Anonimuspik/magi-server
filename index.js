import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN; // твой Hugging Face токен
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

// Промт, который отправляем модели
function buildPrompt(text) {
  return `
Ты Casper — мягкий и человечный модератор чата. Твоя задача:
- Определить нарушения сообщения.
- Выдать наказание минимально возможное.
- Объяснить свои рассуждения (обсуждение в чате), почему такое наказание.
- Не завышать баллы и время мута.
- Если оскорбление слабое — минимальный мут, без предупреждений.

Пример структуры ответа:

Нарушения:
- [список нарушений]

Баллы: [число]

Предлагаемое наказание:
- [мут/время, варны если есть]

Причина (обсуждение):
- Casper объяснил, почему наказание такое, почему минимальное, что учтено.

Текст для анализа:
"${text}"
`;
}

// Endpoint для анализа жалобы
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста" });

    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: buildPrompt(text)
      })
    });

    const data = await response.json();

    // Берем текст из ответа модели
    let analysis = "";
    if (data?.choices?.[0]?.message?.content) {
      analysis = data.choices[0].message.content;
    } else {
      analysis = "⚠️ Сервер не вернул анализ.";
    }

    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
