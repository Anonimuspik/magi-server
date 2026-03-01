import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Хранилище жалоб
const complaints = {};

// --- Команда для подачи жалобы ---
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
function kasperAnalysis(text, prevScores = []) {
  // Каспер — самый человечный, учитывает контекст и шутки
  let score = 0, reasons = [];

  if (/дурак|тупой|идиот/i.test(text)) {
    score += 1;
    reasons.push("Оскорбление в шутку/нежестко");
  }
  if (/гей|недоумок/i.test(text)) {
    score += 2;
    reasons.push("Оскорбление личности");
  }

  // Мягко корректируем баллы, если предыдущие мозги высоко оценили жесткость
  if (prevScores.some(s => s > 2)) score += 0; // Каспер не добавляет лишние баллы

  return { mag: "Kasper", score, reasons, punishment: { mute: score ? "1ч" : "0м", warnings: score } };
}

function melchiorAnalysis(text, prevScores = []) {
  // Мельхиор — средний, учитывает правила и дисциплину
  let score = 0, reasons = [];

  if (/ссора|спам|нарушение/i.test(text)) {
    score += 1;
    reasons.push("Нарушение дисциплины");
  }
  if (/гей|идиот|дурак/i.test(text)) {
    score += 2;
    reasons.push("Оскорбления");
  }

  // Усиливаем, если Каспер не поставил высоко
  if (prevScores[0] < 2) score += 1;

  return { mag: "Melchior", score, reasons, punishment: { mute: score ? "1ч" : "0м", warnings: score } };
}

function balthasarAnalysis(text, prevScores = []) {
  // Бальтазар — строгий, учитывает угрозы, опасное поведение
  let score = 0, reasons = [];

  if (/стрелять|убью|насилие/i.test(text)) {
    score += 3;
    reasons.push("Опасное поведение");
  }

  // Если другие мозги уже поставили высокий балл — усиливаем наказание
  if (prevScores.some(s => s >= 2)) score += 1;

  return { mag: "Balthasar", score, reasons, punishment: { mute: score ? "2ч" : "0м", warnings: score } };
}

// --- Функция анализа жалобы с выводом вердиктов каждого мага ---
function analyzeComplaint(text) {
  const results = [];

  // Каспер первый
  const kasper = kasperAnalysis(text);
  results.push(kasper);

  // Мельхиор учитывает Каспера
  const melchior = melchiorAnalysis(text, [kasper.score]);
  results.push(melchior);

  // Бальтазар учитывает всех предыдущих
  const balthasar = balthasarAnalysis(text, [kasper.score, melchior.score]);
  results.push(balthasar);

  // Финальный вердикт — максимальные наказания
  const finalPunishment = {
    mute: results.reduce((acc, r) => (r.punishment.mute > acc ? r.punishment.mute : acc), "0м"),
    warnings: results.reduce((acc, r) => (r.punishment.warnings > acc ? r.punishment.warnings : 0))
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

  // Показываем вердикт каждого мага в чате
  analysis.results.forEach(res => {
    bot.sendMessage(chatId, `🔹 ${res.mag} вынес вердикт:\nБаллы: ${res.score}\nПричины: ${res.reasons.join(", ") || "-"}\nПредлагаемое наказание: мут ${res.punishment.mute}, предупреждения: ${res.punishment.warnings}`);
  });

  // Финальное решение
  const final = analysis.final;
  bot.sendMessage(chatId, `🔹 Решение MAGI:\nСуммарные баллы: ${final.totalScore}\nНаказание: мут ${final.finalPunishment.mute}, предупреждения: ${final.finalPunishment.warnings}`);
});
