// index.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/*
  Casper — локальная реализация "мягкого" модератора.
  POST /analyze { "text": "..." } -> returns JSON analysis
*/

const RULES = {
  insults: {
    name: "Оскорбления",
    basePoints: 1,
    maxMute: 15 // minutes (Casper uses soft values)
  },
  personalBoundary: {
    name: "Нарушение личных границ",
    basePoints: 1,
    maxMute: 15
  },
  provocation: {
    name: "Провокации",
    basePoints: 1,
    maxMute: 10
  },
  quarrel: {
    name: "Ссоры / Конфликты",
    basePoints: 1,
    maxMute: 15
  }
};

// lists / regexes for detection (case-insensitive)
const INSULT_KEYWORDS = [
  "\\bдурак\\b",
  "\\bидиот\\b",
  "\\bтупой\\b",
  "\\bгей\\b",
  "\\bлесба\\b",
  "\\bпидор\\b",
  // add other forms as needed
];
const STRONG_PROFANITY = [
  "бляд", "хуй", "пизд" // fragments to detect obscene words (caution)
];

const PERSONAL_BOUNDARY_KEYWORDS = [
  "\\bгей\\b",
  "\\bлесби(я|нк)\\b",
  "\\bтранс(гендер|ик)\\b",
  "\\bсексуальн",
  "\\bориентац"
];

function regexAny(list, text) {
  const t = text.toLowerCase();
  for (const pat of list) {
    const re = new RegExp(pat, "i");
    if (re.test(t)) return true;
  }
  return false;
}

function detectProvocation(text) {
  const t = text.toLowerCase();
  // simple signals of provocation: direct challenge words or "провоц"
  if (/провоц|задирать|подстрек|разозни|спровоцир/.test(t)) return true;
  // repeated exclamation and insults together may indicate provocation
  if ((t.match(/!/g) || []).length >= 2 && regexAny(INSULT_KEYWORDS, t)) return true;
  return false;
}

function detectQuarrel(text) {
  // If message contains "иди нах" or "да иди ты" or direct back-and-forth markers
  if (/(иди|пошел|пошла).*(нах|нахуй)|давай|ну иди/.test(text.toLowerCase())) return true;
  return false;
}

function detectStrongProfanity(text) {
  return regexAny(STRONG_PROFANITY, text);
}

function analyzeTextCasper(text) {
  const lower = text.trim();
  const violations = [];
  let points = 0;

  const isInsult = regexAny(INSULT_KEYWORDS, lower);
  const isPersonal = regexAny(PERSONAL_BOUNDARY_KEYWORDS, lower);
  const isProvocation = detectProvocation(lower);
  const isQuarrel = detectQuarrel(lower);
  const hasStrongProfanity = detectStrongProfanity(lower);

  // Casper policy: be conservative — only include provocation/quarrel if clear
  if (isInsult) {
    violations.push(RULES.insults.name);
    // base 1, increase to 2 if strong profanity
    points += hasStrongProfanity ? 2 : RULES.insults.basePoints;
  }

  if (isPersonal) {
    // If personal (protected characteristic), count as boundary violation,
    // but Casper keeps total points modest: add 1 but we'll cap later
    violations.push(RULES.personalBoundary.name);
    points += RULES.personalBoundary.basePoints;
  }

  if (isProvocation) {
    // only add if clear
    violations.push(RULES.provocation.name);
    points += RULES.provocation.basePoints;
  }

  if (isQuarrel) {
    violations.push(RULES.quarrel.name);
    points += RULES.quarrel.basePoints;
  }

  // Casper softness: cap points and prefer minimal mute + minimal or zero warnings
  // Normalize points
  if (points <= 0) points = 0;
  if (points > 3) points = 3;

  // Decide punishment depending on points but keep it soft
  // Rules for Casper:
  // points 0 -> no action
  // points 1 -> mute 10-15 min, warnings 0
  // points 2 -> mute 20-30 min, warnings 0 or 1
  // points 3 -> mute 45-60 min, warnings 1
  let proposedMute = 0;
  let proposedWarnings = 0;

  if (points === 1) {
    proposedMute = 15; // minutes
    proposedWarnings = 0;
  } else if (points === 2) {
    proposedMute = 30;
    proposedWarnings = 0;
  } else if (points === 3) {
    proposedMute = 60;
    proposedWarnings = 1;
  }

  // But special rule from user: for simple insults (like "Ты гей") prefer mute 15 min and NO warns
  // We can detect this case: single insult + personal boundary only
  if (isInsult && !hasStrongProfanity && !isProvocation && !isQuarrel) {
    // if only insult/personalBoundary and points <=2, apply minimal policy
    if (points <= 2) {
      proposedMute = 15;
      proposedWarnings = 0;
      points = Math.min(points, 1); // prefer 1 point for mild cases
    }
  }

  // Build human explanation (reasoning) — list of bullet points
  const reasoning = [];

  if (isInsult) {
    reasoning.push(
      `Casper: обнаружено возможное оскорбление в тексте${isPersonal ? " (упоминание характеристики личности)" : ""}.`
    );
    if (hasStrongProfanity) reasoning.push("Casper: присутствует грубая лексика, это усиливает серьёзность высказывания.");
    reasoning.push("Casper: за цель смягчения наказания выбрал минимально эффективную меру, чтобы участник осознал проступок без излишнего штрафа.");
  } else {
    reasoning.push("Casper: явных оскорблений не обнаружено.");
  }

  if (isPersonal && isInsult) {
    reasoning.push("Casper: сообщение затрагивает личную характеристику (напр., сексуальную ориентацию) — это учитывается, но не обязательно требует жёсткого наказания в одиночном случае.");
  }

  if (isProvocation) {
    reasoning.push("Casper: также отмечена провокационная формулировка, которая может подталкивать к конфликту; это усилит меру при повторных нарушениях.");
  }

  if (isQuarrel) {
    reasoning.push("Casper: в сообщении присутствуют элементы эскалации/побуждения к ссоре.");
  }

  if (points === 0) {
    reasoning.push("Casper: предлагаю не применять наказаний, вместо этого — предупредить автора в личных сообщениях (если это уместно).");
  } else {
    reasoning.push(
      `Casper: итог — мягкая мера: мут ${proposedMute} минут${proposedWarnings ? ` и ${proposedWarnings} предупреждение(й)` : ""}.`
    );
    reasoning.push("Casper: варны не разбрасываются по пустякам — выдаются только при повторных или усиленных нарушениях.");
  }

  return {
    lastComplaint: text,
    violations: violations.length ? violations : ["Нарушений не выявлено"],
    points,
    proposedPunishment: {
      muteMinutes: proposedMute,
      warnings: proposedWarnings
    },
    reasoning
  };
}

app.post("/analyze", (req, res) => {
  const { text } = req.body;
  if (typeof text !== "string") {
    return res.status(400).json({ error: "Ожидается поле text: string" });
  }

  const analysis = analyzeTextCasper(text);
  return res.json({ analysis });
});

app.get("/", (req, res) => {
  res.send("Casper moderator running");
});

app.listen(PORT, () => {
  console.log(`Casper server running on port ${PORT}`);
});
