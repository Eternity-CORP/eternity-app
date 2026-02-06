import { spawn } from 'child_process';
import { config } from './config.js';

/**
 * Call Claude Code CLI with a prompt
 * Uses CLAUDE_CODE_OAUTH_TOKEN for authentication
 */
export async function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`📤 Calling Claude...`);

    const args = [
      '--print',
      '--model', 'sonnet',
      '--dangerously-skip-permissions',
      prompt
    ];

    const child = spawn('claude', args, {
      cwd: process.cwd(),
      timeout: config.claudeTimeout,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
        TERM: 'dumb'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      console.error('❌ Claude spawn error:', error.message);
      reject(new Error(`Claude failed: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Claude exit code:', code);
        console.error('stderr:', stderr);
        reject(new Error(`Claude exited with code ${code}`));
        return;
      }

      // Clean up the output
      let output = stdout.trim();

      // Remove ANSI escape codes
      output = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

      console.log(`📥 Claude responded (${output.length} chars)`);
      resolve(output);
    });
  });
}

/**
 * Call Growth agent
 */
export async function callGrowth(): Promise<string> {
  return callClaude(`Ты Growth Lead криптокошелька E-Y (ранняя стадия).
Дай краткий план на сегодня: 3 главные задачи для роста.
Фокус: первые пользователи, Twitter присутствие, гранты.
Ответь кратко, максимум 150 слов.`);
}

/**
 * Call Content agent
 */
export async function callContent(type?: string): Promise<string> {
  return callClaude(`Создай ${type || 'Twitter'} пост для криптокошелька E-Y.
Тема: building in public, крипто UX без сложностей.
Ответь ТОЛЬКО готовым текстом поста. Максимум 280 символов.`);
}

/**
 * Call Opportunities agent
 */
export async function callOpportunities(): Promise<string> {
  return callClaude(`Назови 3 актуальных гранта/программы для crypto стартапов.
Формат: Название — сумма — дедлайн.
Только факты, без воды. Максимум 100 слов.`);
}
