// AI 엔터테인먼트 타입 정의

export interface AiMbti {
  type: string; // 예: "ENFP", "ISTJ" 등
  description: string; // 톡방의 MBTI 설명
  traits: string[]; // 특징 리스트 (최대 3-4개)
}

export interface AiFortune {
  group: string; // 단체 운세 텍스트
  keywords: string[]; // 키워드 리스트 (최대 3-4개)
}

export interface AiHotTopic {
  topic: string; // 핫토픽 제목
  description: string; // 설명
  frequency?: number; // 언급 빈도 (선택적)
}

export interface AiEntertainment {
  mbti: AiMbti;
  fortune: AiFortune;
  hotTopics: AiHotTopic[];
}
