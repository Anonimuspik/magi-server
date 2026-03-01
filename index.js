/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\n🔹 Анализ жалобы...\n🔹 Последняя жалоба: " + complaint);

// Уникальные роли агентов
const roleCasper    = "Ты Casper — эмоционально человечный анализатор.";
const roleMelchior  = "Ты Melchior — логический строгий анализатор правил чата.";
const roleBalthasar = "Ты Balthasar — анализируешь угрозы и вред для сообщества.";

// Функция запроса к серверу анализа
async function askAI(role, prompt) {
  let res = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: `${role}\n${prompt}` }
  });
  return res.data?.analysis || "Ответ отсутствует.";
}

// Раунд 1: первые мнения
let c1 = await askAI(roleCasper, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Casper: ${c1}`);

let m1 = await askAI(roleMelchior, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Melchior: ${m1}`);

let b1 = await askAI(roleBalthasar, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Balthasar: ${b1}`);

// Раунд 2: обсуждение каспером мнений других
let c2 = await askAI(roleCasper,
  `Ответь на мнения других:\nMelchior сказал: "${m1}"\nBalthasar сказал: "${b1}"`);
Bot.sendMessage(`💬 Casper обсуждает: ${c2}`);

// Мельхиор отвечает касперу и Бальтазару
let m2 = await askAI(roleMelchior,
  `Ответь на мнения других:\nCasper сказал: "${c1}"\nBalthasar сказал: "${b1}"`);
Bot.sendMessage(`💬 Melchior обсуждает: ${m2}`);

// Бальтазар отвечает касперу и мельхиору
let b2 = await askAI(roleBalthasar,
  `Ответь на мнения других:\nCasper сказал: "${c1}"\nMelchior сказал: "${m1}"`);
Bot.sendMessage(`💬 Balthasar обсуждает: ${b2}`);

// Финальный синтез
let finalPrompt = `
На основе всех реплик:
Casper: ${c1}
Melchior: ${m1}
Balthasar: ${b1}

Casper обсуждал: ${c2}
Melchior обсуждал: ${m2}
Balthasar обсуждал: ${b2}

Составь итоговый вердикт и объясни почему.
`;
let finalVerdict = await askAI(roleMelchior, finalPrompt);
Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
