import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Хранилище жалоб
const complaints = {};

// Команда /complain — сохраняем жалобу
bot.onText(/\/complain/, msg => {
  const chatId = msg.chat.id;
  complaints[chatId] = { text: "" };
  bot.sendMessage(chatId, "Напишите текст жалобы:");
});

// Сохраняем текст жалобы
bot.on("message", msg => {
  const chatId = msg.chat.id;
  if (!complaints[chatId] || complaints[chatId].text) return;
  complaints[chatId].text = msg.text;
  bot.sendMessage(chatId, "Жалоба принята. Используйте /magi для анализа.");
});

// Вспомогательная функция запроса к серверу анализа
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

// Описание ролей агентов
const ROLE_CASPER = `
Ты Casper — ИИ‑агент, который оценивает жалобу с человеческой точки зрения:
— оцени эмоциональную окраску сообщения,
— как слова могут восприниматься другими,
— объясни, почему считаешь своё мнение важным,
— при возможности предлагай более мягкие решения.
`;

const ROLE_BALTHASAR = `
Ты Balthasar — ИИ‑агент, оценивающий вред, угрозы и влияние на атмосферу сообщества:
— оцени, насколько выражение может навредить атмосфере,
— объясни, почему считаешь своё мнение важным.
`;

// Команда /magi — анализ жалобы
bot.onText(/\/magi/, async msg => {
  const chatId = msg.chat.id;
  const complaint = complaints[chatId]?.text;

  if (!complaint) {
    return bot.sendMessage(chatId, "⚠️ Сначала отправьте жалобу через /complain.");
  }

  bot.sendMessage(chatId, "Reportbot:\n🔹 Начинаем анализ жалобы...");

  // Первый круг мнений
  const casperOpinion = await askAI(ROLE_CASPER, `Жалоба: "${complaint}"`);
  const balthasarOpinion = await askAI(ROLE_BALTHASAR, `Жалоба: "${complaint}"`);

  bot.sendMessage(chatId, `🧠 Casper: ${casperOpinion}`);
  bot.sendMessage(chatId, `🧠 Balthasar: ${balthasarOpinion}`);

  // Casper отвечает на мнение Balthasar
  const casperResponds = await askAI(
    ROLE_CASPER,
    `Ответ Balthasar: "${balthasarOpinion}". Объясни, почему ты считаешь своё мнение важным.`
  );
  bot.sendMessage(chatId, `💬 Casper отвечает: ${casperResponds}`);

  // Balthasar отвечает на мнение Casper
  const balthasarResponds = await askAI(
    ROLE_BALTHASAR,
    `Ответ Casper: "${casperOpinion}". Casper второй раунд: "${casperResponds}". Объясни своё мнение.`
  );
  bot.sendMessage(chatId, `💬 Balthasar отвечает: ${balthasarResponds}`);

  // Финальный collective prompt с структурированными пунктами
  const finalPrompt = `
На основе всех реплик:
Casper первый: ${casperOpinion}
Balthasar первый: ${balthasarOpinion}

Casper обсудил: ${casperResponds}
Balthasar обсудил: ${balthasarResponds}

Составь итоговый вердикт по жалобе. В ответе обязательно:

1) Перечисли все нарушения (каждой строкой отдельно).
2) Укажи за каждое нарушение, сколько баллов начислено.
3) Предложи конкретное наказание (например: мут, предупреждения и т.д.).
4) Подробно объясни *почему* ты так решил — включи аргументы каждого агента:
   — что сказал Casper и почему это важно;
   — что сказал Balthasar и почему это важно.
5) Объясни, как именно аргументы этих агентов повлияли на итоговое решение.
6) Напиши всё понятно, как для реального модератора, с небольшими тезисными блоками.
`;

  const finalVerdict = await askAI(
    `Ты Melchior — ИИ‑агент, который подводит итог и формирует коллективное решение.`,
    finalPrompt
  );

  bot.sendMessage(chatId, `🔹 Итоговое решение MAGI:\n${finalVerdict}`);
});
