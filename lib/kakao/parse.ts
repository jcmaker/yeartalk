import { parseSeoulLocalDateTimeToIsoUtc } from "@/lib/kakao/time";
import type { ChatMessage, ParsedChat } from "@/types/analysis";

// Support multiple date formats:
// Format 1: YYYY.MM.DD. 오전/오후 H:MM, Name : Message
// Format 2: YYYY년 M월 D일 오전/오후 H:MM, Name : Message
const MESSAGE_PATTERN_1 =
  /^(\d{4})\.(\d{2})\.(\d{2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*(.+)$/;
const MESSAGE_PATTERN_2 =
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*(.+)$/;
const SYSTEM_PATTERN = /^(.+?)님이\s+(.+?)님을\s+초대했습니다\.$/;
const ATTACHMENT_PATTERN = /^(사진|이모티콘)(\s+\d+장)?$/;
const DELETION_PATTERN = /^메시지가\s+삭제되었습니다\.$/;

function parseKoreanTime(
  year: string,
  month: string,
  day: string,
  ampm: string,
  hour: string,
  minute: string,
): string | null {
  try {
    let h = Number.parseInt(hour, 10);
    const m = Number.parseInt(minute, 10);

    if (ampm === "오후" && h !== 12) {
      h += 12;
    } else if (ampm === "오전" && h === 12) {
      h = 0;
    }

    return parseSeoulLocalDateTimeToIsoUtc({
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10),
      day: Number.parseInt(day, 10),
      hour: h,
      minute: m,
    });
  } catch {
    return null;
  }
}

export function parseKakaoTxt(content: string): ParsedChat {
  // Handle both \r\n and \n line endings, and trim each line
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const messages: ChatMessage[] = [];
  const participants = new Set<string>();
  let title: string | undefined;
  let exportedAt: string | undefined;

  for (const line of lines) {
    // Try to extract title from header (first few lines)
    if (!title && (line.includes("카카오톡") || line.includes("대화"))) {
      // Extract title from various formats
      const titleMatch = line.match(/(.+?)\s*카카오톡/);
      if (titleMatch) {
        title = titleMatch[1].trim();
      } else if (line.includes("대화")) {
        title = line.replace(/\s*카카오톡.*$/, "").trim() || undefined;
      }
      if (title) continue;
    }

    // Try to extract export date (various formats)
    if (!exportedAt) {
      if (line.match(/저장한 날짜/)) {
        exportedAt = line;
        continue;
      }
      if (line.match(/^\d{4}[.년]\s*\d{1,2}[.월]/)) {
        exportedAt = line;
        continue;
      }
    }

    // Match regular message - Format 1: YYYY.MM.DD.
    let msgMatch = line.match(MESSAGE_PATTERN_1);
    if (msgMatch) {
      const [, year, month, day, ampm, hour, minute, author, text] = msgMatch;
      const ts = parseKoreanTime(year, month, day, ampm, hour, minute);

      if (ts) {
        participants.add(author);
        messages.push({
          ts,
          author,
          kind: "message",
          text: text.trim(),
        });
      }
      continue;
    }

    // Match regular message - Format 2: YYYY년 M월 D일
    msgMatch = line.match(MESSAGE_PATTERN_2);
    if (msgMatch) {
      const [, year, month, day, ampm, hour, minute, author, text] = msgMatch;
      const ts = parseKoreanTime(
        year,
        month.padStart(2, "0"),
        day.padStart(2, "0"),
        ampm,
        hour,
        minute,
      );

      if (ts) {
        participants.add(author);
        messages.push({
          ts,
          author,
          kind: "message",
          text: text.trim(),
        });
      }
      continue;
    }

    // Match system message
    const sysMatch = line.match(SYSTEM_PATTERN);
    if (sysMatch) {
      messages.push({
        ts: new Date().toISOString(), // fallback
        author: null,
        kind: "system",
        text: line,
      });
      continue;
    }

    // Match attachment
    if (ATTACHMENT_PATTERN.test(line)) {
      messages.push({
        ts: new Date().toISOString(), // fallback
        author: null,
        kind: "attachment",
        text: line,
      });
      continue;
    }

    // Match deletion
    if (DELETION_PATTERN.test(line)) {
      messages.push({
        ts: new Date().toISOString(), // fallback
        author: null,
        kind: "message",
        text: line,
      });
    }

    // Unknown line - skip safely (defensive parsing)
  }

  return {
    title,
    exportedAt,
    messages,
    participants: Array.from(participants).sort(),
  };
}
