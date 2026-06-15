import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { Pop3Client, parseEmail } from '../lib/pop3';

interface Rule {
  id: string;
  name: string;
  description: string;
  assignedUserIds: string[];
  priority: string;
}

// ── Claude classification ────────────────────────────────────────────────────

async function classifyEmail(
  subject: string,
  from: string,
  body: string,
  rules: Rule[]
): Promise<{ ruleId: string; reason: string; summary: string } | null> {
  if (!env.anthropicApiKey || rules.length === 0) return null;

  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

  const rulesText = rules
    .map((r, i) => `${i + 1}. ID: "${r.id}"\n   Kategori: ${r.name}\n   Açıklama: ${r.description}`)
    .join('\n\n');

  const prompt = `Sen bir e-posta sınıflandırma asistanısın. Aşağıdaki e-postayı inceleyerek hangi kategoriye girdiğini belirle ve içeriğini kısaca özetle.

E-posta:
Kimden: ${from || '(bilinmiyor)'}
Konu: ${subject || '(konu yok)'}
İçerik: ${body.slice(0, 1500)}

Kategoriler:
${rulesText}

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{"ruleId": "<kategori_id_veya_null>", "reason": "<kısa Türkçe eşleşme gerekçesi>", "summary": "<e-postanın 3-5 cümlelik Türkçe özeti, gereksiz imza/disclaimer kısımları hariç>"}

Hiçbir kategori uymuyorsa ruleId değeri null olsun. summary her durumda doldurulmalı.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') return null;

  try {
    const text = content.text.trim().replace(/^```json|^```|```$/gm, '').trim();
    const parsed = JSON.parse(text);
    if (!parsed.ruleId) return null;
    const matched = rules.find(r => r.id === parsed.ruleId);
    return matched ? { ruleId: parsed.ruleId, reason: parsed.reason ?? '', summary: parsed.summary ?? '' } : null;
  } catch {
    return null;
  }
}

// ── Poll a single config ─────────────────────────────────────────────────────

async function pollConfig(config: {
  id: string;
  companyId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
  rules: Rule[];
}) {
  const client = new Pop3Client();

  try {
    await client.connect(config.host, config.port, config.useTls);
    await client.login(config.username, config.password);

    const uidlMap = await client.uidl(); // { msgNum: uid }

    if (Object.keys(uidlMap).length === 0) {
      await client.quit();
      return;
    }

    // Get already-processed UIDs for this config
    const processed = new Set(
      (await prisma.emailLog.findMany({
        where: { emailConfigId: config.id },
        select: { messageUid: true },
      })).map(l => l.messageUid)
    );

    const newEntries = Object.entries(uidlMap).filter(([, uid]) => !processed.has(uid));

    for (const [msgNumStr, uid] of newEntries) {
      const msgNum = parseInt(msgNumStr, 10);
      let subject = '';
      let from = '';
      let status = 'UNMATCHED';
      let matchedRuleId: string | null = null;
      let taskId: string | null = null;
      let aiReason: string | null = null;

      try {
        const raw = await client.retr(msgNum);
        const parsed = parseEmail(raw);
        subject = parsed.subject;
        from = parsed.from;

        const match = await classifyEmail(parsed.subject, parsed.from, parsed.body, config.rules);

        if (match) {
          const rule = config.rules.find(r => r.id === match.ruleId);
          if (rule && rule.assignedUserIds.length > 0) {
            const taskDescription = `${from ? `Kimden: ${from}\n\n` : ''}${match.summary || parsed.body.slice(0, 800)}`;
            const taskTitle = subject || '(E-postadan gelen görev)';
            // Create one task per assigned user
            const tasks = await Promise.all(
              rule.assignedUserIds.map(userId =>
                prisma.task.create({
                  data: {
                    companyId: config.companyId,
                    title: taskTitle,
                    description: taskDescription,
                    assignedUserId: userId,
                    priority: rule.priority,
                    status: 'TODO',
                  },
                })
              )
            );
            taskId = tasks[0].id;
            matchedRuleId = rule.id;
            aiReason = match.reason;
            status = 'PROCESSED';
          }
        }
      } catch (err) {
        console.error(`[EmailPoller] Failed to process message ${msgNum}:`, err);
        status = 'ERROR';
      }

      await prisma.emailLog.create({
        data: {
          companyId: config.companyId,
          emailConfigId: config.id,
          messageUid: uid,
          subject,
          fromAddress: from,
          matchedRuleId,
          taskId,
          aiReason,
          status,
        },
      });
    }

    await client.quit();
  } catch (err) {
    console.error(`[EmailPoller] Connection error for config ${config.id}:`, err);
    try { await client.quit(); } catch {}
  }

  await prisma.emailConfig.update({
    where: { id: config.id },
    data: { lastPolledAt: new Date() },
  });
}

// ── Main polling loop (called every minute from server.ts) ───────────────────

export async function pollAllActiveConfigs() {
  const configs = await prisma.emailConfig.findMany({
    where: { isActive: true },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, description: true, assignedUserIds: true, priority: true },
      },
    },
  });

  const now = Date.now();

  for (const config of configs) {
    const intervalMs = config.pollIntervalMinutes * 60 * 1000;
    const elapsed = config.lastPolledAt ? now - config.lastPolledAt.getTime() : Infinity;
    if (elapsed < intervalMs) continue;

    pollConfig(config).catch(err =>
      console.error(`[EmailPoller] Unhandled error for config ${config.id}:`, err)
    );
  }
}

// ── Start the global ticker ──────────────────────────────────────────────────

export function startEmailPoller() {
  // Run immediately on startup, then every 60 seconds
  pollAllActiveConfigs().catch(console.error);
  setInterval(() => pollAllActiveConfigs().catch(console.error), 60_000);
  console.log('📧 Email poller started (tick: 60s)');
}
