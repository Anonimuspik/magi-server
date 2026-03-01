import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Хранилище жалоб
const complaints = {};

// --- Команда /complain ---
bot.onText(/\/complain/, msg => {
  const chatId = msg.chat.id;
  complaints[chatId] = { text: "" };
  bot.sendMessage(chatId, "Напишите текст жалобы:");
});

// --- Сохраняем текст жалобы ---
bot.on("message", msg => {
  const chatId = msg.chat.id;
  if (!complaints[chatId] || complaints[chatId].text) return;
  complaints[chatId].text = msg.text;
  bot.sendMessage(chatId, "Жалоба принята. Используйте /magi для анализа.");
});

// Функция анализа через твой сервер
async function askAI(rolePrompt, userPrompt) {
  try {
    const response = await fetch("https://magi-server-hr70.onrender.com/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rolePrompt + "\n" + userPrompt })
    });
    const data = await response.json();
    return data.analysis || "Анализ недоступен.";
  } catch (e) {
    console.error(e);
    return "Ошибка анализа сервера.";
  }
}

// --- Роль Casper (человечный анализ) ---
const ROLE_CASPER = `
Ты Casper — ИИ‑агент, который оценивает жалобу с человеческой точки зрения.
Ответ должен включать, как слова могут эмоционально воздействовать,
как они воспринимаются другими, и объяснение мотивации.
`;

// --- Роль Balthasar (опасность/вред) ---
const ROLE_BALTHASAR = `
Ты Balthasar — ИИ‑агент, который оценивает жалобу с точки зрения вреда,
опасности, нарушений атмосферного и социальной безопасности чата.
`;

// --- Команда /magi ---
bot.onText(/\/magi/, async msg => {
  const chatId = msg.chat.id;
  const complaint = complaints[chatId]?.text;

  if (!complaint) {
    return bot.sendMessage(chatId, "⚠️ Сначала отправьте жалобу через /complain.");
  }

  bot.sendMessage(chatId, "Reportbot:\n🔹 Начинаем анализ жалобы...");

  // Первый круг мнений
  const casperOpinion    = await askAI(ROLE_CASPER, `Жалоба: "${complaint}"`);
  const balthasarOpinion = await askAI(ROLE_BALTHASAR, `Жалоба: "${complaint}"`);

  bot.sendMessage(chatId, `🧠 Casper: ${casperOpinion}`);
  bot.sendMessage(chatId, `🧠 Balthasar: ${balthasarOpinion}`);

  // Второй круг — ответы друг другу
  const casperResponds = await askAI(
    ROLE_CASPER,
    `Ответ Balthasar: "${balthasarOpinion}". Теперь обоснуй, почему ты считаешь своё мнение важным.`
  );
  bot.sendMessage(chatId, `💬 Casper отвечает: ${casperResponds}`);

  const balthasarResponds = await askAI(
    ROLE_BALTHASAR,
    `Ответ Casper: "${casperOpinion}". Casper второй раунд: "${casperResponds}". Поясни своё мнение.`
  );
  bot.sendMessage(chatId, `💬 Balthasar отвечает: ${balthasarResponds}`);

  // Финальный коллективный вердикт
  const finalPrompt = `
На основе всех реплик:
Casper первый: ${casperOpinion}
Balthasar первый: ${balthasarOpinion}

Casper обсуждал: ${casperResponds}
Balthasar обсуждал: ${balthasarResponds}

Составь итоговый вердикт по жалобе. В ответе обязательно:
1) Перечислить нарушения (что именно было нарушено),
2) Указать баллы нарушений,
3) Предложить наказание,
4) Объяснить *почему* это решение с аргументами Casper и Balthasar.
`;
  
  const finalVerdict = await askAI(
    `Ты Melchior — ИИ‑агент, который подводит итог и формирует коллективное решение.`,
    finalPrompt
  );

  bot.sendMessage(chatId, `🔹 Итоговое решение MAGI:\n${finalVerdict}`);
});
