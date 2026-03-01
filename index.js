import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;// твой Hugging Face токен
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"; // модель

// Endpoint для анализа жалобы
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Нет текста" });

    // Запрос к Hugging Face API
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `Проанализируй эту жалобу по правилам чата и выдай:
        1. Нарушения
        2. Баллы
        3. Предлагаемое наказание
        Текст: ${text}`
      })
    });

    const data = await response.json();
    res.json({ analysis: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
