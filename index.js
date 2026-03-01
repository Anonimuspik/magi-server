/* command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\n🔹 Анализ жалобы...\n🔹 Последняя жалоба: " + complaint);

const ROLE_CASPER    = "Ты Casper — человеческий и тонкий анализатор: оцени эмоции, тон и человечность выражения.";
const ROLE_BALTHASAR = "Ты Balthasar — строго оцени уровень вреда, угроз и возможный вред сообществу.";

async function askAI(role, prompt) {
  let res = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: role + "\n" + prompt }
  });
  return res.data?.analysis || "ответ отсутствует.";
}

// Раунд 1 — первичные мнения
let casper1 = await askAI(ROLE_CASPER, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Casper: ${casper1}`);

let balthasar1 = await askAI(ROLE_BALTHASAR, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Balthasar: ${balthasar1}`);

// Раунд 2 — Casper отвечает Balthasar
let casper2 = await askAI(
  ROLE_CASPER,
  `Ответ Balthasar: "${balthasar1}"\nПоясни, почему ты считаешь это важным.`
);
Bot.sendMessage(`💬 Casper отвечает: ${casper2}`);

// Раунд 3 — Balthasar отвечает Casper
let balthasar2 = await askAI(
  ROLE_BALTHASAR,
  `Casper сказал: "${casper1}"\nCasper ответил: "${casper2}"\nПоясни, почему ты так считаешь.`
);
Bot.sendMessage(`💬 Balthasar отвечает: ${balthasar2}`);

// Финальный итог с явным объяснением причин

let finalPrompt = `
На основе:
Casper: ${casper1}
Balthasar: ${balthasar1}

Casper обсудил: ${casper2}
Balthasar обсудил: ${balthasar2}

Составь итоговый вердикт. Обязательно укажи:
1) какие нарушения
2) сколько баллов
3) предлагаемые наказания
4) *и подробно объясни почему* ты так решил, с отсылкой к репликам Casper и Balthasar.
`;

let finalVerdict = await askAI(
  "Ты Melchior — строгий логик, который формирует итог, учитывая объяснения других агентов.",
  finalPrompt
);

Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
