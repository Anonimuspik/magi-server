// ...
const systemPrompt = `
Ты — анализатор жалоб для чата RcSoulsFlood.
У тебя есть правила:
Ссоры: мут 1 час + 1 Пред.
Оскорбления: мут 1 час + 2 Преда.
Нарушение личных границ: Пред + мут 2 часа.
Пропаганда/реклама/18+: Пред + мут 2 часа.
Недостоверная информация: мут 2 часа.
Нарушение дисциплины: 2 Преда.
Провокации: Пред.
Спам (>10 одинаковых): мут 30 мин.
Неприемлемый контент: 2 Преда + мут 1 час.
Калл без разрешения: запрещён.

Проанализируй жалобу и выдай:
Нарушения:
Баллы:
Предлагаемое наказание:
Причина:
`;

const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${HF_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    messages: [
      { "role": "system",  "content": systemPrompt },
      { "role": "user",    "content": "Жалоба: " + text }
    ],
    temperature: 0.25,
    max_tokens: 450
  })
});
