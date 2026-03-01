/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\n🔹 Анализ жалобы...\n🔹 Последняя жалоба: " + complaint);

// Агентские промты
const SYSTEM_CASPER = "Ты Casper — оцени человеческую сторону, эмоции и тон, будь мягким.";
const SYSTEM_MELCHIOR = "Ты Melchior — строго оцени по правилам чата и логике наказаний.";
const SYSTEM_BALTHASAR = "Ты Balthasar — оцени угрозу и вред для сообщества.";

// Функция запроса
async function getAnswer(systemPrompt, userPrompt) {
  let res = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: {"Content-Type": "application/json"},
    body: { text: `${systemPrompt}\n\n${userPrompt}` }
  });
  return res.data?.analysis || "Ответ отсутствует";
}

// Раунд 1: первичные мнения
let answerCasper1 = await getAnswer(SYSTEM_CASPER, complaint);
Bot.sendMessage(`🧠 Casper: ${answerCasper1}`);

let answerMelchior1 = await getAnswer(SYSTEM_MELCHIOR, complaint);
Bot.sendMessage(`🧠 Melchior: ${answerMelchior1}`);

let answerBalthasar1 = await getAnswer(SYSTEM_BALTHASAR, complaint);
Bot.sendMessage(`🧠 Balthasar: ${answerBalthasar1}`);

// Раунд 2: обсуждение мнений друг друга
let answerCasper2 = await getAnswer(
  SYSTEM_CASPER,
  `Теперь обсуди мнения:\nMelchior: ${answerMelchior1}\nBalthasar: ${answerBalthasar1}`
);
Bot.sendMessage(`💬 Casper отвечает на мнения: ${answerCasper2}`);

let answerMelchior2 = await getAnswer(
  SYSTEM_MELCHIOR,
  `Теперь обсуди мнения:\nCasper: ${answerCasper1}\nBalthasar: ${answerBalthasar1}`
);
Bot.sendMessage(`💬 Melchior отвечает на мнения: ${answerMelchior2}`);

let answerBalthasar2 = await getAnswer(
  SYSTEM_BALTHASAR,
  `Теперь обсуди мнения:\nCasper: ${answerCasper1}\nMelchior: ${answerMelchior1}`
);
Bot.sendMessage(`💬 Balthasar отвечает на мнения: ${answerBalthasar2}`);

// Финальный вердикт
let finalPrompt = `
Сформируйте итог на основе всех сообщений:
Casper: ${answerCasper1}
Melchior: ${answerMelchior1}
Balthasar: ${answerBalthasar1}

Casper обсудил: ${answerCasper2}
Melchior обсудил: ${answerMelchior2}
Balthasar обсудил: ${answerBalthasar2}
`;
let finalVerdict = await getAnswer(SYSTEM_MELCHIOR, finalPrompt);

Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
