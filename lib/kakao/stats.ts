import type {
  ChatMessage,
  ParticipantStats,
  ActivityStats,
  RoomStatsData,
} from "@/types/analysis";
import { computeFixedAwards } from "@/lib/kakao/awards";
import { getSeoulHour, getSeoulWeekdayIndex } from "@/lib/kakao/time";

function countTokens(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

export function computeStats(
  messages: ChatMessage[],
  participants: string[]
): RoomStatsData {
  const participantMap = new Map<string, ParticipantStats>();
  const byHour: Record<number, number> = {};
  const byWeekday: Record<number, number> = {};
  let totalAttachments = 0;

  // Initialize participant stats
  for (let i = 0; i < participants.length; i++) {
    const alias = String.fromCharCode(65 + i); // A, B, C, ...
    participantMap.set(participants[i], {
      displayName: participants[i],
      alias,
      messageCount: 0,
      attachmentCount: 0,
      topTokens: {
        laughter: 0,
        cry: 0,
        punctuation: 0,
      },
    });
  }

  // Process messages
  for (const msg of messages) {
    if (msg.kind === "attachment") {
      totalAttachments++;
      if (msg.author && participantMap.has(msg.author)) {
        const stats = participantMap.get(msg.author)!;
        stats.attachmentCount++;
      }
      continue;
    }

    if (msg.kind !== "message" || !msg.author) continue;

    const stats = participantMap.get(msg.author);
    if (!stats) continue;

    stats.messageCount++;

    // Count tokens
    stats.topTokens.laughter += countTokens(msg.text, [/ㅋ+/g, /ㅎ+/g]);
    stats.topTokens.cry += countTokens(msg.text, [/ㅠ+/g, /ㅜ+/g]);
    stats.topTokens.punctuation += countTokens(msg.text, [/[!?…]/g]);

    // Activity by hour/weekday (Asia/Seoul)
    const hour = getSeoulHour(msg.ts);
    const weekday = getSeoulWeekdayIndex(msg.ts);
    if (hour !== null) byHour[hour] = (byHour[hour] || 0) + 1;
    if (weekday !== null) byWeekday[weekday] = (byWeekday[weekday] || 0) + 1;
  }

  // Detect bursts (messages within 5 minutes)
  const bursts: Array<{ start: string; end: string; messageCount: number }> =
    [];
  let currentBurst: ChatMessage[] = [];
  const BURST_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  for (const msg of messages) {
    // kind="message" only + system/unknown 제외
    if (msg.kind !== "message" || !msg.ts || !msg.author) continue;

    try {
      const msgTime = new Date(msg.ts).getTime();

      if (currentBurst.length === 0) {
        currentBurst.push(msg);
        continue;
      }

      const firstTime = new Date(currentBurst[0].ts).getTime();
      if (msgTime - firstTime <= BURST_WINDOW_MS) {
        currentBurst.push(msg);
      } else {
        if (currentBurst.length >= 3) {
          bursts.push({
            start: currentBurst[0].ts,
            end: currentBurst[currentBurst.length - 1].ts,
            messageCount: currentBurst.length,
          });
        }
        currentBurst = [msg];
      }
    } catch {
      // Skip invalid timestamps
    }
  }

  if (currentBurst.length >= 3) {
    bursts.push({
      start: currentBurst[0].ts,
      end: currentBurst[currentBurst.length - 1].ts,
      messageCount: currentBurst.length,
    });
  }

  return {
    // kind="message" only + system/unknown 제외
    totalMessages: messages.filter((m) => m.kind === "message" && !!m.author)
      .length,
    totalAttachments,
    participants: Array.from(participantMap.values()),
    activity: {
      byHour,
      byWeekday,
    },
    fixedAwards: computeFixedAwards({
      messages,
      participants: Array.from(participantMap.values()),
      quickReplyMinutes: 3,
    }),
    bursts,
  };
}
