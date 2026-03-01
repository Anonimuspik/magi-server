/* command: /magi */

let last = Bot.getProp("lastComplaint");
if (!last) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot: Анализ жалобы...\n🔹 Последняя жалоба: " + last);

// Промпты для агентов
const systemCasper = "Ты Casper — оценщик человечности, тона и социальной чувствительности. " +
"Сначала дай свой вердикт по жалобе, потом оцени аргументы других агентов.";

const systemMelchior = "Ты Melchior — строго следуешь правилам чата и логике наказаний. " +
"Первый даёшь вердикт, затем отвечаешь на аргументы других.";

const systemBalthasar = "Ты Balthasar — оцениваешь уровень опасности и вреда в сообщении. " +
"Сначала дай свою оценку, потом обсуди с остальными.";

async function askAgent(name, systemPrompt, complaint, history = []) {
  let messages = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: "Жалоба: " + complaint }
  ];
  // добавить аргументы из истории
  history.forEach(m => messages.push(m));
  
  let response = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: {"Content-Type": "application/json"},
    body: { text: JSON.stringify(messages) }
  });
  
  let text = response.data?.analysis || "Не смог оценить жалобу.";
  return { name, text };
}

// Первый круг — вердикты
let c1 = await askAgent("Casper", systemCasper, last);
Bot.sendMessage(`🧠 ${c1.name}: ${c1.text}`);

let m1 = await askAgent("Melchior", systemMelchior, last);
Bot.sendMessage(`🧠 ${m1.name}: ${m1.text}`);

let b1 = await askAgent("Balthasar", systemBalthasar, last);
Bot.sendMessage(`🧠 ${b1.name}: ${b1.text}`);

// Сбор аргументов для обсуждения
let history = [
  { role: "assistant", content: `${c1.name} сказал: ${c1.text}` },
  { role: "assistant", content: `${m1.name} сказал: ${m1.text}` },
  { role: "assistant", content: `${b1.name} сказал: ${b1.text}` }
];

// Второй круг — обсуждения
let c2 = await askAgent("Casper", systemCasper, last, history);
Bot.sendMessage(`💬 ${c2.name} доп.: ${c2.text}`);

let m2 = await askAgent("Melchior", systemMelchior, last, history);
Bot.sendMessage(`💬 ${m2.name} доп.: ${m2.text}`);

let b2 = await askAgent("Balthasar", systemBalthasar, last, history);
Bot.sendMessage(`💬 ${b2.name} доп.: ${b2.text}`);

// Итог
Bot.sendMessage("🔹 Итоговое решение MAGI:\nОцените описания выше и сформируйте обоснованное решение на основе обсуждения.");
