/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

Bot.sendMessage("Reportbot:\nАнализ жалобы...\n🔹 Последняя жалоба: " + complaint);

// Промт, объясняющий задачи каждого мага
let promptCasper = `Ты Casper — оцени эмоциональную и человеческую сторону. Оцени жалобу с точки зрения человечности, тона и контекста.\nЖалоба: "${complaint}"`;

let promptMelchior = `Ты Melchior — строгий логик. Оцени жалобу строго по правилам чата RcSoulsFlood.\nЖалоба: "${complaint}"`;

let promptBalthasar = `Ты Balthasar — оцени уровень вреда и опасности. Оцени, насколько сообщение может вредить участникам или атмосфере чата.\nЖалоба: "${complaint}"`;

// Функция вызова аналайзера
async function requestMag(prompt) {
  let response = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: prompt }
  });
  return response.data?.analysis || "Не удалось получить ответ";
}

// Первый круг — каждый выносит свой вердикт
let casperVerdict = await requestMag(promptCasper);
Bot.sendMessage(`🧠 Casper: ${casperVerdict}`);

let melchiorVerdict = await requestMag(promptMelchior);
Bot.sendMessage(`🧠 Melchior: ${melchiorVerdict}`);

let balthasarVerdict = await requestMag(promptBalthasar);
Bot.sendMessage(`🧠 Balthasar: ${balthasarVerdict}`);

// Составляем историю мнений для обсуждения
let discussionHistory = 
`Casper сказал: ${casperVerdict}\nMelchior сказал: ${melchiorVerdict}\nBalthasar сказал: ${balthasarVerdict}`;

// Второй круг обсуждения
let casperDiscuss = await requestMag(
  `Теперь обсуди мнения других магов и приведи аргументы:\n${discussionHistory}`
);
Bot.sendMessage(`💬 Casper обсуждение: ${casperDiscuss}`);

let melchiorDiscuss = await requestMag(
  `Теперь обсуди мнения других магов и приведи аргументы:\n${discussionHistory}`
);
Bot.sendMessage(`💬 Melchior обсуждение: ${melchiorDiscuss}`);

let balthasarDiscuss = await requestMag(
  `Теперь обсуди мнения других магов и приведи аргументы:\n${discussionHistory}`
);
Bot.sendMessage(`💬 Balthasar обсуждение: ${balthasarDiscuss}`);

// Финальный синтез вердиктов
let finalVerdictPrompt = 
`На основе всех высказанных мнений (см. ниже), составь итоговый вердикт по жалобе:\n\n` +
discussionHistory + "\n\n" +
`Casper обсуждал: ${casperDiscuss}\n` +
`Melchior обсуждал: ${melchiorDiscuss}\n` +
`Balthasar обсуждал: ${balthasarDiscuss}`;

let finalVerdict = await requestMag(finalVerdictPrompt);
Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
