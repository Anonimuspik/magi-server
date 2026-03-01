import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const MAGI_URL = process.env.MAGI_URL || "https://magi-server-hr70.onrender.com/analyze";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN не задан в .env");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранилище жалоб (в памяти)
const complaints = new Map();

// Вспомог: запрос к magi-server (или другому анализатору)
async function callAnalyze(text) {
  try {
    const res = await fetch(MAGI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const json = await res.json();
    // Ожидаем { analysis: "..." }
    return (json && (json.analysis || json.result || json.output)) || JSON.stringify(json);
  } catch (e) {
    console.error("Ошибка callAnalyze:", e);
    return "Ошибка анализа (сервер недоступен).";
  }
}

/* ===========================
   РОЛИ — промпты агентов
   =========================== */

const ROLE_CASPER = `
Ты — Casper, ИИ-агент, думающий как человек. Твоя цель — максимально понять человека и по возможности смягчить наказание.
Инструкции:
- Оцени эмоциональную окраску сообщения и предположительное намерение (шутка, злость, провокация, простая грубость).
- Если нарушение не явно опасное — предлагай мягкие меры (предупреждение, разговор с участником, временный mute минимальной длительности).
- Всегда давай аргументы, почему предлагаешь смягчение (как это поможет сообществу, снизит эскалацию, даст шанс исправиться).
- Пиши коротко, человечно, приводя 2–3 тезиса: что чувствуешь в тексте, почему это можно смягчить, какой мягкий вариант наказания предлагаешь.
`;

const ROLE_BALTHASAR = `
Ты — Balthasar, ИИ-агент, оценивающий угрозу, вред и влияние на атмосферу сообщества.
Инструкции:
- Оцени, содержит ли сообщение угрозы, дискриминацию, прямое унижение.
- Если есть риск эскалации или вреда — предложи более жёсткие меры.
- Обоснуй, почему именно такие меры подходят (риск, примеры последствий).
- Пиши 2–3 чётких пункта: что нарушено, почему это опасно, какое наказание адекватно.
`;

const ROLE_MELCHIOR = `
Ты — Melchior, итоговый модератор, который собирает аргументы от Casper и Balthasar и формирует окончательное решение.
Твоя задача — составить структурированный вердикт:
1) список нарушений (по строкам),
2) баллы за каждое нарушение,
3) конкретное наказание (mute, warnings и т.д.),
4) подробное объяснение "почему" в виде аргументов: 
   — что сказал Casper и почему это важно;
   — что сказал Balthasar и почему это важно;
   — как их аргументы совместно повлияли на итог.
Пиши понятно, тезисно, без воды.
`;

/* ===========================
   Команды бота
   =========================== */

// /complain — начать жалобу
bot.onText(/\/complain/, (msg) => {
  const chatId = msg.chat.id;
  complaints.set(chatId, { text: null });
  bot.sendMessage(chatId, "Отправь текст жалобы (одно сообщение).");
});

// Ловим обычные сообщения — если чат ожидает жалобу, сохраняем
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text) return;

  // Игнорируем системные команды (начинаются с '/'), они обрабатываются отдельно
  if (msg.text.startsWith("/")) return;

  const slot = complaints.get(chatId);
  if (!slot) return; // не ожидаем жалобу

  if (!slot.text) {
    slot.text = msg.text.trim();
    complaints.set(chatId, slot);
    bot.sendMessage(chatId, "Жалоба сохранена. Вызови /magi чтобы начать анализ.");
  }
});

// /magi — запуск полной процедуры: два агента -> обсуждение -> финал
bot.onText(/\/magi/, async (msg) => {
  const chatId = msg.chat.id;
  const slot = complaints.get(chatId);
  if (!slot || !slot.text) {
    return bot.sendMessage(chatId, "⚠️ Нет сохранённой жалобы. Сначала /complain и отправь текст.");
  }

  const complaint = slot.text;
  await bot.sendMessage(chatId, "Reportbot:\n🔹 Начинаем анализ жалобы...");
  await bot.sendMessage(chatId, `🔹 Последняя жалоба: ${complaint}\n`);

  // Раунд 1: первичные мнения
  const casperPrompt1 = `${ROLE_CASPER}\nЖалоба: "${complaint}"\nПожалуйста, дай короткое мнение (2–3 тезиса) и предложи мягкую меру, если считаешь возможным.`;
  const balthasarPrompt1 = `${ROLE_BALTHASAR}\nЖалоба: "${complaint}"\nПожалуйста, дай короткое мнение (2–3 тезиса) и предложи меру, если считаешь необходимым.`;

  const casperOpinion = await callAnalyze(casperPrompt1);
  await bot.sendMessage(chatId, `🧠 Casper (первичное мнение):\n${casperOpinion}`);

  const balthasarOpinion = await callAnalyze(balthasarPrompt1);
  await bot.sendMessage(chatId, `🧠 Balthasar (первичное мнение):\n${balthasarOpinion}`);

  // Раунд 2: обсуждение — Casper отвечает на мнение Balthasar (пытается смягчить)
  const casperPrompt2 = `${ROLE_CASPER}
Жалоба: "${complaint}"
Мнение Balthasar: "${balthasarOpinion}"
Теперь подробно ответь на мнение Balthasar. Если считаешь возможным смягчить наказание — аргументируй почему и предложи конкретный мягкий вариант. Приводи 2 тезиса, начинай с "Причина смягчения: ...".`;
  const casperResponds = await callAnalyze(casperPrompt2);
  await bot.sendMessage(chatId, `💬 Casper отвечает на Balthasar:\n${casperResponds}`);

  // Balthasar отвечает на Casper
  const balthasarPrompt2 = `${ROLE_BALTHASAR}
Жалоба: "${complaint}"
Мнение Casper: "${casperOpinion}"
Casper ответил на моё мнение: "${casperResponds}"
Теперь ответь подробно: согласен/не согласен и почему. Если считаешь, что смягчать нельзя — объясни риск.`;
  const balthasarResponds = await callAnalyze(balthasarPrompt2);
  await bot.sendMessage(chatId, `💬 Balthasar отвечает на Casper:\n${balthasarResponds}`);

  // Финальный collective prompt — явная структура с требованием аргументов
  const finalPrompt = `
${ROLE_MELCHIOR}

На основе всех реплик (ниже) составь окончательный вердикт по жалобе в чётком формате.
Требования: обязательно включи подпункты, как указано (ниже).
Реплики:
- Casper (первое): ${casperOpinion}
- Balthasar (первое): ${balthasarOpinion}
- Casper (ответ): ${casperResponds}
- Balthasar (ответ): ${balthasarResponds}

В ответе обязательно:
1) Перечисли нарушения (каждой строкой отдельно).
2) За каждое нарушение укажи количество баллов (числом).
3) Предложи конкретное наказание (мут, предупреждения и т.д.) — по пунктам.
4) Подробно объясни *почему* — раздели объяснение на блоки:
   — Что сказал Casper и почему это важно (цитата/короткий тезис).
   — Что сказал Balthasar и почему это важно (цитата/короткий тезис).
   — Как их аргументы повлияли на окончательное решение (связь аргументов → наказание).
5) В конце добавь короткое человечное резюме (1–2 предложения) — в духе Casper.
6) Формат ответа: нумерованные пункты и маркированные списки для причин.
`;

  const finalVerdict = await callAnalyze(finalPrompt);
  await bot.sendMessage(chatId, `🔹 Итоговое решение MAGI:\n${finalVerdict}`);

  // По желанию — очистить жалобу (чтобы не анализировать снова)
  complaints.delete(chatId);
});

/* --- graceful shutdown --- */
process.on("SIGINT", () => {
  console.log("Stopping bot...");
  process.exit();
});
