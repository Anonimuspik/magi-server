/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\n🔹 Анализ жалобы...\n🔹 Последняя жалоба: " + complaint);

// Промты, моделирующие личности каждого MAGI
let promptCasper = `Ты Casper — эмоционально‑человечный анализатор. Первое мнение по жалобе:\n"${complaint}"`;
let promptMelchior = `Ты Melchior — логичный и строгий анализатор. Первое мнение по жалобе:\n"${complaint}"`;
let promptBalthasar = `Ты Balthasar — анализатор опасности и вреда. Первое мнение по жалобе:\n"${complaint}"`;

// Обёртка для запроса к анализатору
async function askAI(content) {
  let res = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: content }
  });
  return res.data?.analysis || "Ответ отсутствует";
}

// Первый круг — первичные вердикты
let c1 = await askAI(promptCasper);
Bot.sendMessage(`🧠 Casper: ${c1}`);

let m1 = await askAI(promptMelchior);
Bot.sendMessage(`🧠 Melchior: ${m1}`);

let b1 = await askAI(promptBalthasar);
Bot.sendMessage(`🧠 Balthasar: ${b1}`);

// Формируем историю аргументов для обсуждения
let history = 
`Casper: ${c1}\nMelchior: ${m1}\nBalthasar: ${b1}`;

// Второй круг — дискуссия (каждый отвечает на историю аргументов)
let c2 = await askAI(`Casper отвечает на:\n${history}`);
Bot.sendMessage(`💬 Casper обсуждает: ${c2}`);

let m2 = await askAI(`Melchior отвечает на:\n${history}`);
Bot.sendMessage(`💬 Melchior обсуждает: ${m2}`);

let b2 = await askAI(`Balthasar отвечает на:\n${history}`);
Bot.sendMessage(`💬 Balthasar обсуждает: ${b2}`);

// Финальная синтеза‑сведение всех мнений
let finalPrompt = 
`На основе всех мнений, сформируй итог:
Casper: ${c1}
Melchior: ${m1}
Balthasar: ${b1}
Casper обсуждает: ${c2}
Melchior обсуждает: ${m2}
Balthasar обсуждает: ${b2}`;

let finalVerdict = await askAI(finalPrompt);
Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
