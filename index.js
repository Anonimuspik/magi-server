/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\n🔹 Анализ жалобы...\n🔹 Последняя жалоба: " + complaint);

// Роли агентов
const systemCasper    = "Ты Casper — человеческий анализатор: оцени эмоции, тона и человечность.";
const systemMelchior  = "Ты Melchior — логичный строгий анализатор: оцени по правилам чата.";
const systemBalthasar = "Ты Balthasar — анализатор опасности и вреда для сообщества.";

// Функция запроса к серверу анализа
async function askAI(role, message) {
  let res = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: `${role}\n${message}` }
  });
  return res.data?.analysis || "Ответ отсутствует.";
}

// Раунд 1 — базовые мнения
let casper1 = await askAI(systemCasper, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Casper: ${casper1}`);

let melchior1 = await askAI(systemMelchior, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Melchior: ${melchior1}`);

let balthasar1 = await askAI(systemBalthasar, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Balthasar: ${balthasar1}`);

// Раунд 2 — ответы друг другу
let casper2 = await askAI(systemCasper,
  `Ответь на мнения:\nMelchior => ${melchior1}\nBalthasar => ${balthasar1}`);
Bot.sendMessage(`💬 Casper обсуждает: ${casper2}`);

let melchior2 = await askAI(systemMelchior,
  `Ответь на мнения:\nCasper => ${casper1}\nBalthasar => ${balthasar1}`);
Bot.sendMessage(`💬 Melchior обсуждает: ${melchior2}`);

let balthasar2 = await askAI(systemBalthasar,
  `Ответь на мнения:\nCasper => ${casper1}\nMelchior => ${melchior1}`);
Bot.sendMessage(`💬 Balthasar обсуждает: ${balthasar2}`);

// Финальный итог после обсуждения
let finalPrompt = `
На основе всех мнений:
Casper: ${casper1}
Melchior: ${melchior1}
Balthasar: ${balthasar1}

Casper обсудил: ${casper2}
Melchior обсудил: ${melchior2}
Balthasar обсудил: ${balthasar2}

Составь итоговый вердикт и объясни почему.`;

let finalVerdict = await askAI(systemMelchior, finalPrompt);
Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
