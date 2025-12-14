import OpenAI from "openai";
import { OPENAI_MODEL } from "@/config/limits";
import type { RoomAIData, RoomStatsData } from "@/types/analysis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAISummary(
  stats: RoomStatsData,
  participants: Array<{ displayName: string; alias: string }>,
  title?: string,
): Promise<RoomAIData> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  // Prepare participant data for AI
  const participantData = stats.participants.map((p) => ({
    name: p.displayName,
    messages: p.messageCount,
    laughs: p.topTokens.laughter,
    cries: p.topTokens.cry,
    attachments: p.attachmentCount,
  }));

  const participantNamesList = participantData.map((p) => p.name).join(", ");

  const prompt = `카카오톡 채팅 로그를 분석해서 재미있고 유머러스한 연말 회고를 만들어주세요.

채팅방 정보:
${title ? `- 방 제목: ${title}` : ""}
- 총 메시지 수: ${stats.totalMessages}개
- 총 첨부파일: ${stats.totalAttachments}개

참여자 목록 (정확한 이름만 사용하세요):
${participantNamesList}

참여자별 통계:
${participantData
  .map(
    (p) =>
      `- ${p.name}: 메시지 ${p.messages}개, 웃음 ${p.laughs}회, 울음 ${p.cries}회, 첨부파일 ${p.attachments}개`,
  )
  .join("\n")}

다음 JSON 형식으로 응답해주세요:
{
  "awards": [
    {
      "participant": "참여자 실제 이름",
      "title": "상 이름 (예: 최다 메시지상, 웃음왕 등)",
      "description": "상 설명 (왜 이 상을 받았는지 재미있게)"
    }
  ],
  "recap": "전체 요약 (2-3문장, 재미있고 유머러스하게)",
  "fortune": [
    {
      "participant": "참여자 실제 이름",
      "prediction": "내년 운세/예언 (재미있게)"
    }
  ],
  "highlights": [
    "하이라이트 1",
    "하이라이트 2",
    "하이라이트 3"
  ]
}

중요 규칙 (반드시 지켜주세요):
1. "participant" 필드에는 반드시 위 "참여자 목록"에 나온 이름만 정확하게 사용하세요
2. 절대로 참여자 목록에 없는 이름을 만들어내거나 추가하지 마세요
3. 사용 가능한 참여자 이름: ${participantNamesList}
4. 각 참여자마다 통계를 바탕으로 창의적이고 재미있는 상을 만들어주세요 (예: 최다 메시지상, 웃음왕, 울보상, 첨부파일 마스터 등)
5. 상 설명은 왜 그 상을 받았는지 통계를 언급하면서 재미있게 작성해주세요
6. recap은 전체 채팅의 분위기와 특징을 재미있게 요약해주세요
7. fortune은 각 참여자의 성향을 바탕으로 내년 운세를 재미있게 예언해주세요 (참여자 목록의 이름만 사용)
8. highlights는 채팅에서 특별했던 순간들을 재미있게 나열해주세요
9. 전체적으로 유머러스하고 친근한 톤으로 작성해주세요
10. 한국어로 작성해주세요`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "당신은 재미있고 유머러스한 채팅 로그 분석 AI입니다. 항상 유효한 JSON만 응답하세요. 참여자 이름은 정확하게 사용하세요.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content) as RoomAIData;

    // Validate structure
    if (
      !parsed.awards ||
      !Array.isArray(parsed.awards) ||
      !parsed.recap ||
      !parsed.fortune ||
      !Array.isArray(parsed.fortune) ||
      !parsed.highlights ||
      !Array.isArray(parsed.highlights)
    ) {
      throw new Error("Invalid AI response structure");
    }

    // Validate participant names
    const validNames = new Set(participantData.map((p) => p.name));
    const invalidAwards = parsed.awards.filter(
      (a) => !validNames.has(a.participant),
    );
    const invalidFortune = parsed.fortune.filter(
      (f) => !validNames.has(f.participant),
    );

    if (invalidAwards.length > 0 || invalidFortune.length > 0) {
      // Privacy: avoid logging real participant names.
      console.error("AI returned invalid participant names");
      // Fix invalid names
      parsed.awards = parsed.awards.map((a) => {
        if (!validNames.has(a.participant)) {
          // Find closest match or use first participant
          const match = participantData.find(
            (p) =>
              p.name.includes(a.participant) || a.participant.includes(p.name),
          );
          return {
            ...a,
            participant: match?.name || participantData[0]?.name || "",
          };
        }
        return a;
      });
      parsed.fortune = parsed.fortune.map((f) => {
        if (!validNames.has(f.participant)) {
          const match = participantData.find(
            (p) =>
              p.name.includes(f.participant) || f.participant.includes(p.name),
          );
          return {
            ...f,
            participant: match?.name || participantData[0]?.name || "",
          };
        }
        return f;
      });
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI generation failed:", error);
    // Return fallback
    return {
      awards: participants.map((p) => ({
        participant: p.displayName,
        title: "참여자",
        description: `${p.displayName}님이 채팅에 참여하셨습니다.`,
      })),
      recap: "채팅 로그를 분석했습니다.",
      fortune: participants.map((p) => ({
        participant: p.displayName,
        prediction: "새해에도 좋은 일만 가득하길 바랍니다!",
      })),
      highlights: ["채팅 분석이 완료되었습니다."],
    };
  }
}
