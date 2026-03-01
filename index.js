/*command: /magi */

let complaint = Bot.getProp("lastComplaint");
if (!complaint) {
  return Bot.sendMessage("⚠️ Жалобы нет. Сначала отправь её через /complain.");
}

// Тексты ролей
const ROLE_CASPER = "Ты Casper — очень человечный анализатор. Отвечай понятно.";
const ROLE_MELCHIOR = "Ты Melchior — строгий аналитик, оценивай по правилам чата.";
const ROLE_BALTHASAR = "Ты Balthasar — оценивай уровень опасности и вреда.";

// Функция запроса к серверу анализа
async function askAgent(role, text) {
  let res = await HTTP.post({
    url: "https://magi-server-hr70.onrender.com/analyze",
    headers: { "Content-Type": "application/json" },
    body: { text: `${role}\n${text}` }
  });
  return res.data?.analysis || "ответ отсутствует";
}

// Раунд 1: первичные мнения
let casperResp1 = await askAgent(ROLE_CASPER, `Жалоба: "${complaint}"`);
Bot.sendMessage(`🧠 Casper: ${casperResp1}`);

let melchiorResp1 = await askAgent(ROLE_MELCHIOR, `Ответ Casper: ${casperResp1}`);
Bot.sendMessage(`🧠 Melchior: ${melchiorResp1}`);

let balthasarResp1 = await askAgent(
  ROLE_BALTHASAR,
  `Ответ Casper: ${casperResp1}\nОтвет Melchior: ${melchiorResp1}`
);
Bot.sendMessage(`🧠 Balthasar: ${balthasarResp1}`);

// Раунд 2: ответы на ответы
let casperResp2 = await askAgent(
  ROLE_CASPER,
  `Melchior сказал: "${melchiorResp1}"\nBalthasar сказал: "${balthasarResp1}"`
);
Bot.sendMessage(`💬 Casper отвечает: ${casperResp2}`);

let melchiorResp2 = await askAgent(
  ROLE_MELCHIOR,
  `Casper ответил: "${casperResp1}"\nBalthasar сказал: "${balthasarResp1}"`
);
Bot.sendMessage(`💬 Melchior отвечает: ${melchiorResp2}`);

let balthasarResp2 = await askAgent(
  ROLE_BALTHASAR,
  `Casper сказал: "${casperResp1}"\nMelchior ответил: "${melchiorResp1}"`
);
Bot.sendMessage(`💬 Balthasar отвечает: ${balthasarResp2}`);

// Финальный итог на основе всех ответов
let finalPrompt = `
На основе:
Casper: ${casperResp1}
Melchior: ${melchiorResp1}
Balthasar: ${balthasarResp1}

Casper ответил: ${casperResp2}
Melchior ответил: ${melchiorResp2}
Balthasar ответил: ${balthasarResp2}

Составь итоговый вердикт и объясни почему.
`;

let finalVerdict = await askAgent(ROLE_MELCHIOR, finalPrompt);
Bot.sendMessage(`🔹 Итоговое решение MAGI:\n${finalVerdict}`);
