export interface ChatMessage {
  ts: string; // ISO timestamp
  author: string | null; // null => system/unknown
  kind: "message" | "system" | "attachment";
  text: string;
}

export interface ParsedChat {
  title?: string;
  exportedAt?: string;
  messages: ChatMessage[];
  participants: string[];
}

export interface ParticipantStats {
  displayName: string;
  alias: string;
  messageCount: number;
  attachmentCount: number;
  topTokens: {
    laughter: number; // ㅋㅋ, ㅎㅎ
    cry: number; // ㅠㅠ, ㅜㅜ
    punctuation: number; // !, ?, …
  };
}

export interface ActivityStats {
  byHour: Record<number, number>; // 0-23
  byWeekday: Record<number, number>; // 0-6 (Sun-Sat)
}

export interface RoomStatsData {
  totalMessages: number;
  totalAttachments: number;
  participants: ParticipantStats[];
  activity: ActivityStats;
  fixedAwards: Award[];
  bursts: Array<{
    start: string; // ISO timestamp
    end: string;
    messageCount: number;
  }>;
}

export interface Award {
  participant: string; // alias
  title: string;
  description: string;
}

export interface Fortune {
  participant: string; // alias
  prediction: string;
}

export interface RoomAIData {
  awards: Award[];
  recap: string;
  fortune: Fortune[];
  highlights: string[];
  // AI 엔터테인먼트 (선택적)
  mbti?: {
    type: string;
    description: string;
    traits: string[];
  };
  groupFortune?: {
    group: string;
    keywords: string[];
  };
  hotTopics?: Array<{
    topic: string;
    description: string;
    frequency?: number;
  }>;
}
