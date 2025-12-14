// AI 프롬프트 템플릿

import type { RoomStatsData } from "@/types/analysis";

interface PromptContext {
  stats: RoomStatsData;
  participants: Array<{ displayName: string; alias: string }>;
  title?: string;
  awards: Array<{ participant: string; title: string; description: string }>;
  hotTopicCandidates?: string[]; // stats에서 추출한 키워드 후보
  seed: string; // share_slug 또는 content_hash
}

/**
 * 톡방 MBTI 생성 프롬프트
 */
export function buildMbtiPrompt(context: PromptContext): string {
  const { stats, participants, title, awards } = context;

  const participantData = stats.participants.map((p) => ({
    name: p.displayName,
    alias: p.alias,
    messages: p.messageCount,
    laughs: p.topTokens.laughter,
    cries: p.topTokens.cry,
    attachments: p.attachmentCount,
  }));

  const participantNamesList = participantData.map((p) => p.name).join(", ");

  return `카카오톡 채팅방의 전체적인 성격을 MBTI로 분석해주세요.

채팅방 정보:
${title ? `- 방 제목: ${title}` : ""}
- 총 메시지 수: ${stats.totalMessages}개
- 총 첨부파일: ${stats.totalAttachments}개
- 참여자 수: ${participants.length}명

참여자 목록:
${participantNamesList}

참여자별 통계:
${participantData
  .map(
    (p) =>
      `- ${p.name} (${p.alias}): 메시지 ${p.messages}개, 웃음 ${p.laughs}회, 울음 ${p.cries}회, 첨부파일 ${p.attachments}개`,
  )
  .join("\n")}

상장 정보 (톡방의 특징을 파악하는 데 참고):
${awards.map((a) => `- ${a.title}: ${a.description}`).join("\n")}

활동 패턴:
- 시간대별 활동: ${
    Object.keys(stats.activity.byHour).length > 0 ? "활발함" : "보통"
  }
- 요일별 활동: ${
    Object.keys(stats.activity.byWeekday).length > 0 ? "활발함" : "보통"
  }

다음 JSON 형식으로 응답해주세요:
{
  "type": "MBTI 타입 (예: ENFP, ISTJ 등)",
  "description": "이 톡방이 왜 이 MBTI인지 설명 (2-3문장, 재미있고 유머러스하게)",
  "traits": [
    "특징 1 (예: 활발한 대화)",
    "특징 2 (예: 감정 표현이 풍부함)",
    "특징 3 (예: 밤늦게까지 활동)"
  ]
}

중요:
- MBTI는 16가지 중 하나여야 합니다 (E/I, N/S, F/T, J/P 조합)
- 통계 데이터를 바탕으로 객관적으로 분석하세요
- 개인 비방이나 조롱을 하지 마세요
- 한국어로 작성해주세요`;
}

/**
 * 단체 운세 생성 프롬프트 (seed 고정)
 */
export function buildFortunePrompt(context: PromptContext): string {
  const { stats, participants, title, seed } = context;

  const participantData = stats.participants.map((p) => ({
    name: p.displayName,
    alias: p.alias,
    messages: p.messageCount,
    laughs: p.topTokens.laughter,
    cries: p.topTokens.cry,
    attachments: p.attachmentCount,
  }));

  // seed를 숫자로 변환하여 운세의 일관성 보장
  const seedNum = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return `카카오톡 채팅방 전체의 내년 운세를 예언해주세요.

채팅방 정보:
${title ? `- 방 제목: ${title}` : ""}
- 총 메시지 수: ${stats.totalMessages}개
- 참여자 수: ${participants.length}명
- 시드: ${seedNum} (일관된 운세를 위한 고정값)

참여자 목록:
${participantData.map((p) => `${p.name} (${p.alias})`).join(", ")}

참여자별 통계 요약:
${participantData
  .map(
    (p) =>
      `- ${p.name}: 메시지 ${p.messages}개, 웃음 ${p.laughs}회, 첨부파일 ${p.attachments}개`,
  )
  .join("\n")}

활동 패턴:
- 시간대별 활동: ${
    Object.keys(stats.activity.byHour).length > 0 ? "활발함" : "보통"
  }
- 요일별 활동: ${
    Object.keys(stats.activity.byWeekday).length > 0 ? "활발함" : "보통"
  }

다음 JSON 형식으로 응답해주세요:
{
  "group": "이 톡방 전체의 내년 운세 예언 (3-4문장, 재미있고 긍정적으로)",
  "keywords": [
    "키워드 1 (예: 활발한 소통)",
    "키워드 2 (예: 새로운 인연)",
    "키워드 3 (예: 즐거운 추억)"
  ]
}

중요:
- 시드(${seedNum})를 고려하여 같은 채팅방은 항상 같은 운세가 나오도록 해주세요
- 개인 비방이나 조롱을 하지 마세요
- 긍정적이고 재미있는 톤을 유지하세요
- 한국어로 작성해주세요`;
}

/**
 * 핫토픽 생성 프롬프트
 */
export function buildHotTopicsPrompt(context: PromptContext): string {
  const { stats, participants, title, hotTopicCandidates } = context;

  const participantData = stats.participants.map((p) => ({
    name: p.displayName,
    alias: p.alias,
    messages: p.messageCount,
  }));

  const participantNamesList = participantData.map((p) => p.name).join(", ");

  return `카카오톡 채팅방에서 자주 언급된 주제나 화제를 찾아주세요.

채팅방 정보:
${title ? `- 방 제목: ${title}` : ""}
- 총 메시지 수: ${stats.totalMessages}개
- 참여자 수: ${participants.length}명

참여자 목록:
${participantNamesList}

참여자별 메시지 수:
${participantData
  .map((p) => `- ${p.name} (${p.alias}): ${p.messages}개`)
  .join("\n")}

${
  hotTopicCandidates && hotTopicCandidates.length > 0
    ? `키워드 후보 (참고용):
${hotTopicCandidates
  .slice(0, 10)
  .map((k, i) => `${i + 1}. ${k}`)
  .join("\n")}`
    : "키워드 후보: 없음 (통계에서 추출된 키워드가 없습니다)"
}

다음 JSON 형식으로 응답해주세요:
{
  "hotTopics": [
    {
      "topic": "핫토픽 제목 1",
      "description": "이 주제가 왜 화제가 되었는지 설명 (2-3문장)",
      "frequency": 0
    },
    {
      "topic": "핫토픽 제목 2",
      "description": "이 주제가 왜 화제가 되었는지 설명 (2-3문장)",
      "frequency": 0
    },
    {
      "topic": "핫토픽 제목 3",
      "description": "이 주제가 왜 화제가 되었는지 설명 (2-3문장)",
      "frequency": 0
    }
  ]
}

중요:
- 핫토픽은 정확히 3개만 작성하세요
- 통계 데이터와 키워드 후보를 바탕으로 추론하세요
- 개인 비방이나 조롱을 하지 마세요
- 재미있고 긍정적인 톤을 유지하세요
- 한국어로 작성해주세요`;
}
