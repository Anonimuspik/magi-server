import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Хранилище жалоб в памяти (для теста)
const complaints = {};

// --- Команда для начала жалобы ---
bot.onText(/\/complain/, (msg) => {
  const chatId = msg.chat.id;
  complaints[chatId] = { text: "" };
  bot.sendMessage(chatId, "Напишите текст жалобы:");
});

// --- Сохраняем текст жалобы ---
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (!complaints[chatId] || complaints[chatId].text) return;
  complaints[chatId].text = msg.text;
  bot.sendMessage(chatId, "Жалоба сохранена. Нажмите /magi для анализа.");
});

// --- Функции анализа для каждого мага ---
function kasperAnalysis(text) {
  let score = 0, reasons = [];
  if (/дурак|идиот|тупой|[мат]/i.test(text)) {
    score += 2;
    reasons.push("Оскорбления");
  }
  return { mag: "Kasper", score, reasons, punishment: { mute: "1ч", warnings: 2 } };
}

function melchiorAnalysis(text) {
  let score = 0, reasons = [];
  if (/ссора|спам|нарушение/i.test(text)) {
    score += 1;
    reasons.push("Нарушение дисциплины");
  }
  return { mag: "Melchior", score, reasons, punishment: { mute: "30м", warnings: 1 } };
}

function balthasarAnalysis(text) {
  let score = 0, reasons = [];
  if (/угроза|стрелять|насилие/i.test(text)) {
    score += 3;
    reasons.push("Опасное поведение");
  }
  return { mag: "Balthasar", score, reasons, punishment: { mute: "2ч", warnings: 3 } };
}

// --- Функция анализа жалобы ---
function analyzeComplaint(text) {
  const results = [
    kasperAnalysis(text),
    melchiorAnalysis(text),
    balthasarAnalysis(text)
  ];

  // Финальный вердикт: максимальные наказания
  const finalPunishment = {
    mute: results.reduce((acc, r) => r.punishment.mute > acc ? r.punishment.mute : acc, "0м"),
    warnings: results.reduce((acc, r) => r.punishment.warnings > acc ? r.punishment.warnings : 0)
  };

  const totalScore = results.reduce((acc, r) => acc + r.score, 0);

  return { results, final: { totalScore, finalPunishment } };
}

// --- Команда /magi ---
bot.onText(/\/magi/, (msg) => {
  const chatId = msg.chat.id;
  const complaint = complaints[chatId]?.text;

  if (!complaint) return bot.sendMessage(chatId, "⚠️ Нет жалобы. Сначала отправьте её через /complain.");

  bot.sendMessage(chatId, "Reportbot: Начинаем анализ жалобы...");

  const analysis = analyzeComplaint(complaint);

  let message = `🔹 Последняя жалоба: ${complaint}\n\n`;
  for (let res of analysis.results) {
    message += `🔹 ${res.mag}:\nБаллы: ${res.score}\nПричины: ${res.reasons.join(", ") || "-"}\nПредлагаемое наказание: мут ${res.punishment.mute}, предупреждения: ${res.punishment.warnings}\n\n`;
  }

  message += `🔹 Решение MAGI:\nСуммарные баллы: ${analysis.final.totalScore}\nНаказание: мут ${analysis.final.finalPunishment.mute}, предупреждения: ${analysis.final.finalPunishment.warnings}`;

  bot.sendMessage(chatId, message);
});
