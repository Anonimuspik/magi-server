/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\n🔹 Анализ жалобы...\n🔹 Последняя жалоба: " + complaint);

// Тексты «ролей»
const ROLE_CASPER = "Ты Casper — очень человечный анализатор: оцени эмоциональность, тон, чувство человека.";
const ROLE_BALTHASAR = "Ты Balthasar — анализатор опасности и вреда: оцени угрозы, дискриминацию, вред для атмосферы чата.";

// Обёртка для запроса к нашему серверу анализа
async function askAI(role, prompt) {
  let response = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: role + "\n" + prompt }
  });
  return response.data?.analysis || "Ответ отсутствует.";
}

// Раунд 1 — первичные мнения
let casper1 = await askAI(ROLE_CASPER, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Casper: ${casper1}`);

let balthasar1 = await askAI(ROLE_BALTHASAR, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Balthasar: ${balthasar1}`);

// Раунд 2 — ответ Casper на Balthasar
let casper2 = await askAI(
  ROLE_CASPER,
  `Ответ Balthasar: "${balthasar1}"\nТеперь прокомментируй это и обоснуй своё мнение.`
);
Bot.sendMessage(`💬 Casper отвечает: ${casper2}`);

// Раунд 3 — ответ Balthasar на Casper
let balthasar2 = await askAI(
  ROLE_BALTHASAR,
  `Ответ Casper: "${casper1}"\nCasper ответил второй раз: "${casper2}"\nТеперь прокомментируй это и обоснуй своё мнение.`
);
Bot.sendMessage(`💬 Balthasar отвечает: ${balthasar2}`);

// Финальный итог на основе реплик
let finalPrompt = `
На основе всех реплик:
Casper первый: ${casper1}
Balthasar первый: ${balthasar1}
Casper обсуждает: ${casper2}
Balthasar обсуждает: ${balthasar2}

Составь итоговый вердикт и объясни почему.
`;

let finalVerdict = await askAI(
  ROLE_CASPER,
  finalPrompt
);

Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
