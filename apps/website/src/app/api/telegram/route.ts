import { Bot, webhookCallback } from 'grammy';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const linearKey = process.env.LINEAR_API_KEY;

// Create bot instance
const bot = botToken ? new Bot(botToken) : null;

// Create Anthropic client
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

// Get current date
const getCurrentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// ========== SHARED CONTEXT ==========
const SHARED_CONTEXT = `
# E-Y — Shared Context

Дата: ${getCurrentDate()} (${new Date().getFullYear()} год)

## О проекте
E-Y — криптокошелёк с радикально простым UX.

### Ключевые фичи:
- BLIK-коды — 6-значный код вместо адресов (первый в мире для крипто)
- Network Abstraction — пользователь видит "USDC", не "USDC (Polygon)"
- Bank-like UX — интерфейс как у Monobank
- Self-custody — ключи только у пользователя

### Value Proposition:
> "Дай код — получи деньги. Никаких адресов."

### Стадия: Pre-launch (январь 2026)
- MVP готов (mobile app на Expo)
- Ищем первых 50 beta-тестеров
- Подаём заявки на гранты
- Пользователей пока 0

### Целевая аудитория:
| Персона | Описание | Боль |
|---------|----------|------|
| Newcomer | Первый опыт с криптой | Страх потерять деньги |
| Recipient | Принимает оплату в крипте | Не понимает адреса/сети |
| Power User | Хочет привести друзей | Нет простого кошелька |

### Приоритеты:
1. Гранты — бесплатные деньги без dilution (Polygon, Base, USF)
2. Бета-тестеры — 50 человек за 2-3 недели
3. Акселераторы — после 50+ тестеров

### Метрики:
| Метрика | Текущая | Цель (4 недели) |
|---------|---------|-----------------|
| Beta testers | 0 | 50 |
| Twitter followers | 0 | 200 |
| Grants submitted | 0 | 2-3 |
`;

// ========== AGENT: GROWTH LEAD ==========
const GROWTH_AGENT_PROMPT = `${SHARED_CONTEXT}

# Ты — Growth Lead Agent

Роль: Виртуальный Growth CEO для E-Y. Координируешь growth-активности, создаёшь планы, отслеживаешь прогресс.

## Приоритизация задач:
1. 🔴 Дедлайны в ближайшие 3 дня
2. 🔴 Блокеры для других задач
3. 🟡 Гранты (highest ROI)
4. 🟡 User acquisition
5. 🟢 Content creation

## Формат ответа для плана:
📊 Статус:
- Beta testers: X / 50
- Гранты: X подано

📋 План на сегодня:
1. [Задача 1] — приоритет, почему важно
2. [Задача 2]
3. [Задача 3]

## Правила:
- Давай конкретные, actionable задачи
- Учитывай что мы на pre-launch стадии
- Не выдумывай метрики — честно говори "нужно проверить"
- Отвечай кратко, до 200 слов
`;

// ========== AGENT: CONTENT ==========
const CONTENT_AGENT_PROMPT = `${SHARED_CONTEXT}

# Ты — Content & Comms Agent

Роль: Создатель контента для E-Y. Пишешь посты, питчи, письма. Всегда предлагаешь 2-3 варианта на выбор.

## Типы контента:

### Twitter (EN):
- Максимум 280 символов
- Без эмодзи-спама (1-2 максимум)
- Build in public тон
- Конкретика > абстракции

### Telegram (UA/RU):
- Можно длиннее
- Дружелюбный тон
- Честность о стадии
- Призыв к действию

### Grant Applications:
- Профессиональный тон
- Конкретные метрики
- Чёткий roadmap

## Ключевые сообщения:
- "BLIK for crypto" — главная метафора
- "6 digits instead of addresses" — конкретная польза
- "No network selection" — отсутствие сложности

## Формат ответа:
Вариант 1 (Problem-focused):
[текст]

Вариант 2 (Demo-focused):
[текст]

Вариант 3 (Story):
[текст]

Какой нравится? Могу доработать.
`;

// ========== AGENT: OPPORTUNITIES ==========
const OPPORTUNITIES_AGENT_PROMPT = `${SHARED_CONTEXT}

# Ты — Opportunity Hunter Agent

Роль: Ищешь гранты, акселераторы, конкурсы для E-Y. Знаешь основные программы, но НЕ выдумываешь конкретные даты.

## Известные возможности:

ГРАНТЫ (без equity):
- Polygon Grants: $5-50K, Rolling deadline
- Base Grants: $5-100K, Rolling
- Arbitrum Foundation: до $200K
- Ukrainian Startup Fund: до $75K

АКСЕЛЕРАТОРЫ:
- Alliance DAO: $250K, Rolling
- Outlier Ventures: $50-100K

## Статусы:
📝 TODO — Не начато
⏳ Готовим — В процессе
✅ Подано — Заявка отправлена
🔄 Review — На рассмотрении
🎯 Fit! — Хорошо подходит

## Формат ответа:
🎯 Возможности для E-Y

[Таблица грантов]

⚡ Рекомендация: [что делать первым]

## ВАЖНО:
- НЕ выдумывай конкретные даты дедлайнов
- Говори "проверить на официальном сайте"
- Давай ссылки где возможно
`;

// ========== DEFAULT SYSTEM PROMPT ==========
const getSystemPrompt = () => `${SHARED_CONTEXT}

Ты — AI-помощник команды E-Y. Помогаешь с growth, контентом, грантами.

ПРАВИЛА:
1. НЕ пиши код
2. Отвечай кратко (до 200 слов)
3. НЕ выдумывай факты
4. Для дат грантов — "проверить на сайте"
`;

// Info message (HTML format for Telegram)
const INFO_MESSAGE = `🤖 <b>E-Y Growth Bot</b>

<b>🎯 3 AI-агента:</b>

<b>📊 Growth Lead</b>
• /plan — задачи на сегодня → Linear
• /roadmap 10 — план на N дней
• /growth — рекомендации

<b>✍️ Content Agent</b>
• /content — Twitter (2-3 варианта)
• /content telegram — Telegram пост

<b>🎯 Opportunity Hunter</b>
• /opportunities — гранты

<b>📝 Linear:</b>
• /tasks — список
• /task E-XX — детали
• /newtask Название — создать

<b>🔄 Статусы:</b>
/start, /done, /todo, /backlog E-XX

<b>💬 Текстом:</b>
• <code>план на 10 дней</code> → roadmap
• <code>выполнено E-15</code> → done
• <code>E-15 в работу</code> → start

<b>⚡ Флоу:</b>
/roadmap 7 → /start E-XX → работа → /done E-XX

<i>Powered by Claude Sonnet + 3 Agents</i>`;

// Call Claude API
async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  if (!anthropic) {
    return '❌ Anthropic API not configured';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt || getSystemPrompt(),
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) return 'No response';

    // Convert markdown to Telegram HTML
    let text = textBlock.text;

    // ## Heading -> <b>Heading</b>
    text = text.replace(/^###?\s*(.+)$/gm, '<b>$1</b>');
    // **bold** -> <b>bold</b>
    text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    // *italic* -> <i>italic</i> (but not inside words)
    text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<i>$1</i>');
    // `code` -> <code>code</code>
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // - [ ] checkbox -> ☐
    text = text.replace(/^- \[ \]/gm, '☐');
    // - [x] checkbox -> ☑
    text = text.replace(/^- \[x\]/gm, '☑');

    return text;
  } catch (error) {
    console.error('Claude API error:', error);
    return `❌ Ошибка API: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Linear API helper
async function linearRequest(query: string, variables?: Record<string, unknown>) {
  if (!linearKey) {
    throw new Error('Linear API key not configured');
  }

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': linearKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Linear API error');
  }
  return data.data;
}

// Get Linear team ID
async function getLinearTeamId(): Promise<string> {
  const data = await linearRequest(`
    query { teams { nodes { id name } } }
  `);
  return data.teams.nodes[0]?.id;
}

// Create Linear issue
async function createLinearIssue(title: string, description?: string): Promise<string> {
  const teamId = await getLinearTeamId();

  const data = await linearRequest(`
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { identifier title url }
      }
    }
  `, {
    input: {
      teamId,
      title,
      description: description || '',
    }
  });

  if (data.issueCreate.success) {
    const issue = data.issueCreate.issue;
    return `✅ Создана задача: ${issue.identifier}\n${issue.title}\n${issue.url}`;
  }
  return '❌ Не удалось создать задачу';
}

// Get all active Linear issues for the team
async function getLinearTasks(): Promise<string> {
  try {
    const teamId = await getLinearTeamId();

    const data = await linearRequest(`
      query($teamId: String!) {
        team(id: $teamId) {
          issues(first: 15, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
            nodes {
              identifier
              title
              state { name }
              priority
              assignee { name }
            }
          }
        }
      }
    `, { teamId });

    const issues = data.team.issues.nodes;
    if (issues.length === 0) {
      return '📋 Нет активных задач в Linear';
    }

    const priorityEmoji: Record<number, string> = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 0: '⚪' };

    let result = '📋 <b>Активные задачи:</b>\n\n';
    for (const issue of issues) {
      const emoji = priorityEmoji[issue.priority] || '⚪';
      const assignee = issue.assignee?.name ? ` → ${issue.assignee.name}` : '';
      result += `${emoji} <code>${issue.identifier}</code>: ${issue.title}\n   └ ${issue.state.name}${assignee}\n\n`;
    }
    result += '\n<i>Детали: /task E-XX</i>';
    return result;
  } catch (error) {
    console.error('Linear tasks error:', error);
    return `❌ Ошибка Linear: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Get specific Linear issue by identifier (e.g., E-15)
async function getLinearTask(identifier: string): Promise<string> {
  try {
    const data = await linearRequest(`
      query($filter: IssueFilter!) {
        issues(filter: $filter) {
          nodes {
            identifier
            title
            description
            state { name }
            priority
            assignee { name }
            labels { nodes { name } }
            createdAt
            url
          }
        }
      }
    `, {
      filter: {
        number: { eq: parseInt(identifier.replace(/\D/g, '')) }
      }
    });

    const issue = data.issues.nodes[0];
    if (!issue) {
      return `❌ Задача ${identifier} не найдена`;
    }

    const priorityNames: Record<number, string> = { 1: '🔴 Urgent', 2: '🟠 High', 3: '🟡 Medium', 4: '🟢 Low', 0: 'None' };
    const labels = issue.labels.nodes.map((l: { name: string }) => l.name).join(', ') || 'нет';
    const desc = issue.description ? issue.description.substring(0, 500) : '<i>Нет описания</i>';

    return `📌 <b>${issue.identifier}: ${issue.title}</b>

<b>Статус:</b> ${issue.state.name}
<b>Приоритет:</b> ${priorityNames[issue.priority] || 'None'}
<b>Исполнитель:</b> ${issue.assignee?.name || 'Не назначен'}
<b>Метки:</b> ${labels}

<b>Описание:</b>
${desc}

🔗 ${issue.url}`;
  } catch (error) {
    console.error('Linear task error:', error);
    return `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Status types mapping
type StatusType = 'todo' | 'inprogress' | 'done' | 'backlog' | 'canceled';

const STATUS_CONFIG: Record<StatusType, { type: string; emoji: string; label: string }> = {
  backlog: { type: 'backlog', emoji: '📥', label: 'Backlog' },
  todo: { type: 'unstarted', emoji: '📋', label: 'Todo' },
  inprogress: { type: 'started', emoji: '🔄', label: 'In Progress' },
  done: { type: 'completed', emoji: '✅', label: 'Done' },
  canceled: { type: 'canceled', emoji: '❌', label: 'Canceled' },
};

// Get state ID by type for the team
async function getLinearStateId(teamId: string, stateType: string): Promise<string | null> {
  const data = await linearRequest(`
    query($teamId: String!) {
      team(id: $teamId) {
        states { nodes { id name type } }
      }
    }
  `, { teamId });

  const state = data.team.states.nodes.find(
    (s: { type: string }) => s.type === stateType
  );
  return state?.id || null;
}

// Update issue status
async function updateLinearTaskStatus(identifier: string, status: StatusType): Promise<string> {
  try {
    const config = STATUS_CONFIG[status];
    if (!config) {
      return `❌ Неизвестный статус: ${status}`;
    }

    const issueNumber = parseInt(identifier.replace(/\D/g, ''));
    const teamId = await getLinearTeamId();
    const stateId = await getLinearStateId(teamId, config.type);

    if (!stateId) {
      return `❌ Не найден статус "${config.label}"`;
    }

    // First get the issue ID
    const issueData = await linearRequest(`
      query($filter: IssueFilter!) {
        issues(filter: $filter) {
          nodes { id identifier title }
        }
      }
    `, { filter: { number: { eq: issueNumber } } });

    const issue = issueData.issues.nodes[0];
    if (!issue) {
      return `❌ Задача ${identifier} не найдена`;
    }

    // Update the issue state
    await linearRequest(`
      mutation($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) {
          success
        }
      }
    `, { id: issue.id, stateId });

    const messages: Record<StatusType, string> = {
      backlog: 'Задача в бэклоге',
      todo: 'Задача в очереди',
      inprogress: 'Задача в работе! 💪',
      done: 'Задача закрыта! 🎉',
      canceled: 'Задача отменена',
    };

    return `${config.emoji} <b>${messages[status]}</b>\n<code>${issue.identifier}</code>: ${issue.title}`;
  } catch (error) {
    console.error('Update status error:', error);
    return `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Generate daily plan and create tasks in Linear
async function generateDailyPlan(): Promise<string> {
  try {
    // Get current tasks for context
    const teamId = await getLinearTeamId();
    const existingData = await linearRequest(`
      query($teamId: String!) {
        team(id: $teamId) {
          issues(first: 10, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
            nodes { title }
          }
        }
      }
    `, { teamId });

    const existingTasks = existingData.team.issues.nodes.map((i: { title: string }) => i.title).join('\n- ');

    // Ask Growth Agent for 3 new tasks
    const planPrompt = `Текущие задачи в Linear:
${existingTasks || '(пусто)'}

Предложи 3 новые growth-задачи на сегодня.
Учитывай приоритеты: гранты > user acquisition > контент.
Не дублируй существующие задачи.

Ответь СТРОГО в формате JSON:
[
  {"title": "Краткое название", "description": "Что нужно сделать и почему важно"},
  {"title": "Краткое название", "description": "Что нужно сделать"},
  {"title": "Краткое название", "description": "Что нужно сделать"}
]

Только JSON, без markdown.`;

    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: GROWTH_AGENT_PROMPT,
      messages: [{ role: 'user', content: planPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) return '❌ Не удалось сгенерировать план';

    // Parse JSON
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return '❌ Ошибка формата ответа';

    const tasks = JSON.parse(jsonMatch[0]) as Array<{ title: string; description: string }>;

    // Create tasks in Linear
    let result = `📋 <b>План на сегодня (${getCurrentDate()}):</b>\n\n`;

    for (const task of tasks) {
      const data = await linearRequest(`
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { identifier title }
          }
        }
      `, {
        input: {
          teamId,
          title: task.title,
          description: task.description,
        }
      });

      if (data.issueCreate.success) {
        const issue = data.issueCreate.issue;
        result += `✅ <code>${issue.identifier}</code>: ${issue.title}\n`;
      }
    }

    result += `\n<i>Задачи добавлены в Linear. Выполнил? Напиши: выполнено E-XX</i>`;
    return result;
  } catch (error) {
    console.error('Generate plan error:', error);
    return `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Generate N-day roadmap and create tasks in Linear with due dates
async function generateRoadmap(days: number): Promise<string> {
  try {
    if (days < 1 || days > 30) {
      return '❌ Укажи от 1 до 30 дней';
    }

    const teamId = await getLinearTeamId();

    // Get existing tasks for context
    const existingData = await linearRequest(`
      query($teamId: String!) {
        team(id: $teamId) {
          issues(first: 20, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
            nodes { title }
          }
        }
      }
    `, { teamId });

    const existingTasks = existingData.team.issues.nodes.map((i: { title: string }) => i.title).join('\n- ');

    // Ask Growth Agent for N-day roadmap
    const roadmapPrompt = `Создай roadmap на ${days} дней для E-Y.

Текущие задачи (не дублируй):
${existingTasks || '(пусто)'}

Приоритеты:
- Дни 1-3: Гранты (Polygon, Base)
- Дни 4-6: Twitter, контент
- Дни 7+: Outreach, beta-тестеры

Ответь СТРОГО в формате JSON:
[
  {"day": 1, "title": "Задача", "description": "Что сделать"},
  {"day": 2, "title": "Задача", "description": "Что сделать"}
]

${days} задач, по одной на день. Только JSON.`;

    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: GROWTH_AGENT_PROMPT,
      messages: [{ role: 'user', content: roadmapPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) return '❌ Не удалось сгенерировать roadmap';

    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return '❌ Ошибка формата ответа';

    const tasks = JSON.parse(jsonMatch[0]) as Array<{ day: number; title: string; description: string }>;

    // Create tasks in Linear with due dates
    let result = `🗺 <b>Roadmap на ${days} дней:</b>\n\n`;
    const today = new Date();

    for (const task of tasks) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + task.day - 1);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const data = await linearRequest(`
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { identifier title }
          }
        }
      `, {
        input: {
          teamId,
          title: task.title,
          description: task.description,
          dueDate: dueDateStr,
        }
      });

      if (data.issueCreate.success) {
        const issue = data.issueCreate.issue;
        result += `📅 <b>День ${task.day}</b> (${dueDateStr})\n`;
        result += `   <code>${issue.identifier}</code>: ${issue.title}\n\n`;
      }
    }

    result += `\n✅ <i>${tasks.length} задач создано в Linear с due dates</i>`;
    return result;
  } catch (error) {
    console.error('Generate roadmap error:', error);
    return `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Create issue with AI-generated description (using Growth Agent)
async function createLinearIssueWithAI(topic: string): Promise<string> {
  try {
    // Generate description with Growth Agent
    const description = await callClaude(`Сгенерируй описание задачи для Linear.

Тема: ${topic}

Формат:
## Цель
[1-2 предложения — зачем это нужно для growth E-Y]

## Acceptance Criteria
- [ ] Конкретный результат 1
- [ ] Конкретный результат 2
- [ ] Конкретный результат 3

Кратко, actionable.`, GROWTH_AGENT_PROMPT);

    // Create the issue
    const teamId = await getLinearTeamId();
    const data = await linearRequest(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { identifier title url }
        }
      }
    `, {
      input: {
        teamId,
        title: topic,
        description: description,
      }
    });

    if (data.issueCreate.success) {
      const issue = data.issueCreate.issue;
      return `✅ <b>Создана задача с AI-описанием:</b>

<code>${issue.identifier}</code>: ${issue.title}

${description}

🔗 ${issue.url}`;
    }
    return '❌ Не удалось создать задачу';
  } catch (error) {
    console.error('Create issue with AI error:', error);
    return `❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

// Parse Linear commands from text
async function handleLinearCommand(text: string): Promise<string | null> {
  const lowerText = text.toLowerCase();

  // Status changes with patterns
  const statusPatterns: Array<{ patterns: string[]; status: StatusType }> = [
    { patterns: ['выполнено', 'выполнил', 'done', 'закрыл', 'готово', 'сделано', 'завершено'], status: 'done' },
    { patterns: ['в работу', 'в работе', 'начал', 'start', 'in progress', 'inprogress', 'working'], status: 'inprogress' },
    { patterns: ['в очередь', 'todo', 'to do', 'запланировал'], status: 'todo' },
    { patterns: ['в бэклог', 'backlog', 'отложить', 'потом'], status: 'backlog' },
    { patterns: ['отменить', 'отмена', 'cancel', 'canceled'], status: 'canceled' },
  ];

  for (const { patterns, status } of statusPatterns) {
    for (const pattern of patterns) {
      const regex = new RegExp(`${pattern}\\s*(E-\\d+)`, 'i');
      const match = text.match(regex);
      if (match) {
        return await updateLinearTaskStatus(match[1], status);
      }
      // Also check reverse: "E-15 в работу"
      const regexReverse = new RegExp(`(E-\\d+)\\s*${pattern}`, 'i');
      const matchReverse = text.match(regexReverse);
      if (matchReverse) {
        return await updateLinearTaskStatus(matchReverse[1], status);
      }
    }
  }

  // Generate daily plan: "план на сегодня", "задачи на сегодня"
  const planPatterns = ['план на сегодня', 'задачи на сегодня', 'план на день', 'что делать сегодня'];
  if (planPatterns.some(p => lowerText.includes(p))) {
    return await generateDailyPlan();
  }

  // Generate roadmap: "план на 10 дней", "roadmap на 7 дней"
  const roadmapMatch = text.match(/(?:план|roadmap|роадмап)\s*(?:на\s*)?(\d+)\s*(?:дней|дня|день|days)/i);
  if (roadmapMatch) {
    const days = parseInt(roadmapMatch[1]);
    return await generateRoadmap(days);
  }

  // AI-generated task: "сгенерируй задачу: тема"
  const aiPatterns = ['сгенерируй задачу', 'сгенерируй таск', 'generate task', 'ai задача'];
  if (aiPatterns.some(p => lowerText.includes(p))) {
    const match = text.match(/(?:сгенерируй задачу|сгенерируй таск|generate task|ai задача)[:\s]+(.+)/i);
    if (match) {
      return await createLinearIssueWithAI(match[1].trim());
    }
    return '❓ Укажи тему задачи:\n<code>сгенерируй задачу: тема</code>';
  }

  // Simple create: "создай задачу: название"
  const createPatterns = ['создай задачу', 'создай таск', 'новая задача'];
  if (createPatterns.some(p => lowerText.includes(p))) {
    const match = text.match(/(?:создай задачу|создай таск|новая задача)[:\s]+(.+)/i);
    if (match) {
      return await createLinearIssue(match[1].trim());
    }
    return '❓ Укажи название:\n<code>создай задачу: название</code>\n\nИли с AI: <code>сгенерируй задачу: тема</code>';
  }

  // Show task by ID: "задача E-15" or "E-15"
  const taskMatch = text.match(/(?:задача\s+)?(E-\d+)/i);
  if (taskMatch) {
    return await getLinearTask(taskMatch[1]);
  }

  // Show all tasks
  const showPatterns = ['задачи', 'таски', 'tasks', 'linear', 'линеар'];
  if (showPatterns.some(p => lowerText === p || lowerText === `покажи ${p}` || lowerText === `мои ${p}`)) {
    return await getLinearTasks();
  }

  return null;
}

// ========== AGENT RESPONSES ==========

// Growth Lead Agent
async function getGrowthResponse(): Promise<string> {
  return callClaude(`Дай план на сегодня.

Формат:
📊 Статус: (кратко что сейчас)
📋 План на сегодня: 3 конкретные задачи с приоритетами

Кратко, actionable.`, GROWTH_AGENT_PROMPT);
}

// Content Agent
async function getContentResponse(type?: string): Promise<string> {
  const contentType = type || 'twitter';
  const prompt = contentType === 'twitter'
    ? `Создай Twitter пост (build in public тема). Дай 2-3 варианта. Максимум 280 символов каждый.`
    : contentType === 'telegram'
    ? `Создай Telegram пост на русском/украинском. Дай 2-3 варианта.`
    : contentType === 'pitch'
    ? `Создай короткий pitch для E-Y (2-3 предложения). Дай 2-3 варианта.`
    : `Создай ${contentType} контент. Дай 2-3 варианта.`;

  return callClaude(prompt, CONTENT_AGENT_PROMPT);
}

// Opportunities Agent
async function getOpportunitiesResponse(): Promise<string> {
  return callClaude(`Покажи актуальные возможности для E-Y.

Формат:
🎯 ГРАНТЫ: таблица (название, сумма, дедлайн, статус)
🚀 АКСЕЛЕРАТОРЫ: таблица

⚡ Рекомендация: что делать первым

Не выдумывай даты — говори "проверить на сайте".`, OPPORTUNITIES_AGENT_PROMPT);
}

// Setup bot commands
if (bot) {
  // /start
  bot.command('start', async (ctx) => {
    await ctx.reply(INFO_MESSAGE, { parse_mode: 'HTML' });
  });

  // /help and /info
  bot.command(['help', 'info'], async (ctx) => {
    await ctx.reply(INFO_MESSAGE, { parse_mode: 'HTML' });
  });

  // /plan - generate daily plan and create in Linear
  bot.command('plan', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    await ctx.reply('📋 Генерирую план и создаю задачи в Linear...');
    const response = await generateDailyPlan();
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /roadmap N - generate N-day roadmap
  bot.command('roadmap', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const daysStr = ctx.match?.trim();
    const days = parseInt(daysStr || '7');

    if (isNaN(days) || days < 1 || days > 30) {
      await ctx.reply('❓ Укажи количество дней (1-30):\n<code>/roadmap 10</code>', { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(`🗺 Генерирую roadmap на ${days} дней...`);
    const response = await generateRoadmap(days);
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /growth
  bot.command('growth', async (ctx) => {
    await ctx.reply('📊 Анализирую...');
    const response = await getGrowthResponse();
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /content
  bot.command('content', async (ctx) => {
    const type = ctx.match || 'twitter';
    await ctx.reply('✍️ Создаю контент...');
    const response = await getContentResponse(type);
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /opportunities
  bot.command('opportunities', async (ctx) => {
    await ctx.reply('🎯 Ищу возможности...');
    const response = await getOpportunitiesResponse();
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /tasks - show all active tasks
  bot.command(['tasks', 'linear'], async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    await ctx.reply('📋 Загружаю задачи...');
    const response = await getLinearTasks();
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /task E-XX - show specific task details
  bot.command('task', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const identifier = ctx.match?.trim();
    if (!identifier) {
      await ctx.reply('❓ Укажи ID задачи: <code>/task E-15</code>', { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply('🔍 Ищу задачу...');
    const response = await getLinearTask(identifier);
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /done E-XX - mark task as done
  bot.command('done', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const identifier = ctx.match?.trim();
    if (!identifier) {
      await ctx.reply('❓ Укажи ID: <code>/done E-15</code>', { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply('✅ Закрываю...');
    const response = await updateLinearTaskStatus(identifier, 'done');
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /start E-XX - mark task as in progress
  bot.command('start', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const identifier = ctx.match?.trim();
    if (!identifier) {
      await ctx.reply(INFO_MESSAGE, { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply('🔄 Беру в работу...');
    const response = await updateLinearTaskStatus(identifier, 'inprogress');
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /todo E-XX - mark task as todo
  bot.command('todo', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const identifier = ctx.match?.trim();
    if (!identifier) {
      await ctx.reply('❓ Укажи ID: <code>/todo E-15</code>', { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply('📋 Ставлю в очередь...');
    const response = await updateLinearTaskStatus(identifier, 'todo');
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /backlog E-XX - move to backlog
  bot.command('backlog', async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const identifier = ctx.match?.trim();
    if (!identifier) {
      await ctx.reply('❓ Укажи ID: <code>/backlog E-15</code>', { parse_mode: 'HTML' });
      return;
    }
    await ctx.reply('📥 Откладываю в бэклог...');
    const response = await updateLinearTaskStatus(identifier, 'backlog');
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // /newtask - create new task
  bot.command(['newtask', 'newissue'], async (ctx) => {
    if (!linearKey) {
      await ctx.reply('❌ Linear не настроен');
      return;
    }
    const input = ctx.match?.trim();
    if (!input) {
      await ctx.reply('❓ Укажи название:\n<code>/newtask Название задачи</code>\n\nИли с описанием:\n<code>/newtask Название | Описание</code>', { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply('✏️ Создаю задачу...');

    // Check if description provided with |
    const parts = input.split('|').map(p => p.trim());
    const title = parts[0];
    const description = parts[1] || '';

    const response = await createLinearIssue(title, description);
    await ctx.reply(response, { parse_mode: 'HTML' });
  });

  // Handle text messages
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;

    // Skip commands
    if (text.startsWith('/')) return;

    // Check for Linear commands first
    if (linearKey) {
      const linearResponse = await handleLinearCommand(text);
      if (linearResponse) {
        await ctx.reply(linearResponse, { parse_mode: 'HTML' });
        return;
      }
    }

    // Check for keywords
    const lowerText = text.toLowerCase();

    if (lowerText.includes('план') || lowerText.includes('growth') || lowerText.includes('приоритет')) {
      await ctx.reply('📊 Думаю...');
      await ctx.reply(await getGrowthResponse(), { parse_mode: 'HTML' });
    } else if (lowerText.includes('пост') || lowerText.includes('контент') || lowerText.includes('twitter')) {
      await ctx.reply('✍️ Создаю...');
      await ctx.reply(await getContentResponse('twitter'), { parse_mode: 'HTML' });
    } else if (lowerText.includes('грант') || lowerText.includes('opportunit')) {
      await ctx.reply('🎯 Ищу...');
      await ctx.reply(await getOpportunitiesResponse(), { parse_mode: 'HTML' });
    } else if (lowerText.includes('info') || lowerText.includes('помощь') || lowerText.includes('что умеешь')) {
      await ctx.reply(INFO_MESSAGE, { parse_mode: 'HTML' });
    } else {
      // Free-form question
      await ctx.reply('🤔 Думаю...');
      const response = await callClaude(text);
      await ctx.reply(response, { parse_mode: 'HTML' });
    }
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });
}

// Webhook handler
const handleUpdate = bot ? webhookCallback(bot, 'std/http') : null;

export async function POST(req: NextRequest) {
  if (!handleUpdate) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });
  }

  try {
    return await handleUpdate(req);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'E-Y Growth Bot v2',
    ai: anthropic ? 'Claude Sonnet' : 'Not configured',
    linear: linearKey ? 'Connected' : 'Not configured'
  });
}
