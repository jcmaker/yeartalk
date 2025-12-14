import { getSeoulDateKey, getSeoulHour } from "@/lib/kakao/time";
import type { Award, ChatMessage, ParticipantStats } from "@/types/analysis";

const LAUGH_PATTERN = /ㅋㅋ|ㅎㅎ|🤣|😂/;
const PHOTO_PATTERN = /^사진(?:\s+(\d+)장)?$/;
const EMOTICON_PATTERN = /^이모티콘(?:\s+(\d+)(?:개|장))?$/;

const AWARD_TEMPLATES = {
  attendance: {
    title: "출석왕",
    description: "올해 톡방 문을 가장 자주 열었어요.",
  },
  quickReply: {
    title: "칼답러",
    description: "답장이 번개처럼 빠른 톡방의 엔진!",
  },
  laughter: {
    title: "웃음요정상",
    description: "ㅋㅋ로 분위기 살리는 핵심 멤버.",
  },
  photo: {
    title: "짤/사진 공유왕",
    description: "추억을 사진으로 남기는 기록 담당.",
  },
  emoticon: {
    title: "이모티콘 장인",
    description: "말 대신 이모티콘으로 감정 전달 완료.",
  },
  night: {
    title: "새벽 감성러",
    description: "새벽에 톡방을 지키는 감성 담당.",
  },
} as const;

interface PersonAgg {
  displayName: string;
  alias: string;
  totalMessages: number;
  lastActivityMs: number;

  uniqueDays: Set<string>;
  quickReplies: number;
  laughMessages: number;
  photoEvents: number;
  photoPieces: number;
  emoticonEvents: number;
  nightMessages: number;
}

const safeParseMs = (tsIso: string): number | null => {
  const ms = Date.parse(tsIso);
  return Number.isNaN(ms) ? null : ms;
};

const compareCommon = (
  a: PersonAgg,
  b: PersonAgg,
  primaryScoreA: number,
  primaryScoreB: number,
) => {
  if (primaryScoreA !== primaryScoreB) return primaryScoreB - primaryScoreA;
  if (a.totalMessages !== b.totalMessages)
    return b.totalMessages - a.totalMessages;
  if (a.lastActivityMs !== b.lastActivityMs)
    return b.lastActivityMs - a.lastActivityMs;
  // 이름(또는 alias) 사전순
  const nameA = a.displayName || a.alias;
  const nameB = b.displayName || b.alias;
  return nameA.localeCompare(nameB, "ko");
};

export const computeFixedAwards = (args: {
  messages: ChatMessage[];
  participants: ParticipantStats[];
  quickReplyMinutes?: number; // default 3
}): Award[] => {
  const quickReplyWindowMs = (args.quickReplyMinutes ?? 3) * 60 * 1000;

  const people: PersonAgg[] = args.participants.map((p) => ({
    displayName: p.displayName,
    alias: p.alias,
    totalMessages: 0,
    lastActivityMs: 0,
    uniqueDays: new Set<string>(),
    quickReplies: 0,
    laughMessages: 0,
    photoEvents: 0,
    photoPieces: 0,
    emoticonEvents: 0,
    nightMessages: 0,
  }));

  const byName = new Map<string, PersonAgg>();
  for (const p of people) byName.set(p.displayName, p);

  const baseMessages = args.messages
    .filter(
      (
        m,
      ): m is (typeof args.messages)[number] & { author: string; ts: string } =>
        m.kind === "message" && typeof m.author === "string" && Boolean(m.ts),
    )
    .map((m) => {
      const ms = safeParseMs(m.ts);
      return ms
        ? {
            tsIso: m.ts,
            ms,
            author: m.author,
            text: m.text ?? "",
          }
        : null;
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .sort((a, b) => a.ms - b.ms);

  // Aggregate per person (common totals + per-award metrics)
  for (const msg of baseMessages) {
    const person = byName.get(msg.author);
    if (!person) continue;

    person.totalMessages += 1;
    person.lastActivityMs = Math.max(person.lastActivityMs, msg.ms);

    const dateKey = getSeoulDateKey(msg.tsIso);
    if (dateKey) person.uniqueDays.add(dateKey);

    if (LAUGH_PATTERN.test(msg.text)) {
      person.laughMessages += 1;
    }

    const photoMatch = msg.text.trim().match(PHOTO_PATTERN);
    if (photoMatch) {
      person.photoEvents += 1; // 행동 기준 1회
      const n = photoMatch[1] ? Number.parseInt(photoMatch[1], 10) : 1;
      if (!Number.isNaN(n) && n > 0) person.photoPieces += n;
    }

    const emoticonMatch = msg.text.trim().match(EMOTICON_PATTERN);
    if (emoticonMatch) {
      person.emoticonEvents += 1;
    }

    const hour = getSeoulHour(msg.tsIso);
    if (hour !== null && hour >= 0 && hour <= 5) {
      person.nightMessages += 1;
    }
  }

  // Quick replies (칼답러): 직전 메시지 작성자가 다른 사람 && N분 이내
  for (let i = 1; i < baseMessages.length; i++) {
    const cur = baseMessages[i];
    const prev = baseMessages[i - 1];
    if (cur.author === prev.author) continue;
    if (cur.ms - prev.ms > quickReplyWindowMs) continue;
    const person = byName.get(cur.author);
    if (!person) continue;
    person.quickReplies += 1;
  }

  const pickWinner = (
    score: (p: PersonAgg) => number,
    extraCompare?: (a: PersonAgg, b: PersonAgg) => number,
  ) => {
    if (people.length === 0) return null;
    return [...people].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (extraCompare) {
        const primary = sb - sa;
        if (primary !== 0) return primary;
        const extra = extraCompare(a, b);
        if (extra !== 0) return extra;
        return compareCommon(a, b, sa, sb);
      }
      return compareCommon(a, b, sa, sb);
    })[0];
  };

  const attendanceWinner = pickWinner((p) => p.uniqueDays.size);
  const quickReplyWinner = pickWinner((p) => p.quickReplies);
  const laughterWinner = pickWinner((p) => p.laughMessages);
  const photoWinner = pickWinner((p) => p.photoEvents);
  const emoticonWinner = pickWinner((p) => p.emoticonEvents);
  const nightWinner = pickWinner(
    (p) => p.nightMessages,
    // 동점이면 새벽 비율 우선
    (a, b) => {
      const ra = a.totalMessages > 0 ? a.nightMessages / a.totalMessages : 0;
      const rb = b.totalMessages > 0 ? b.nightMessages / b.totalMessages : 0;
      if (ra !== rb) return rb - ra;
      return 0;
    },
  );

  const toAward = (
    winner: PersonAgg | null,
    template: { title: string; description: string },
  ): Award => ({
    participant: winner?.alias || winner?.displayName || "",
    title: template.title,
    description: template.description,
  });

  return [
    toAward(attendanceWinner, AWARD_TEMPLATES.attendance),
    toAward(quickReplyWinner, AWARD_TEMPLATES.quickReply),
    toAward(laughterWinner, AWARD_TEMPLATES.laughter),
    toAward(photoWinner, AWARD_TEMPLATES.photo),
    toAward(emoticonWinner, AWARD_TEMPLATES.emoticon),
    toAward(nightWinner, AWARD_TEMPLATES.night),
  ];
};
