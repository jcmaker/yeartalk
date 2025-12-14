// AI 엔터테인먼트 생성 함수

import OpenAI from "openai";
import { z } from "zod";
import { OPENAI_MODEL } from "@/config/limits";
import type {
  AiEntertainment,
  AiFortune,
  AiHotTopic,
  AiMbti,
} from "@/types/ai";
import type { RoomStatsData } from "@/types/analysis";
import {
  buildFortunePrompt,
  buildHotTopicsPrompt,
  buildMbtiPrompt,
} from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Zod 스키마 정의
const MbtiTypeSchema = z.enum([
  "ISTJ",
  "ISTP",
  "ISFJ",
  "ISFP",
  "INTJ",
  "INTP",
  "INFJ",
  "INFP",
  "ESTJ",
  "ESTP",
  "ESFJ",
  "ESFP",
  "ENTJ",
  "ENTP",
  "ENFJ",
  "ENFP",
]);

const AiMbtiSchema = z.object({
  type: MbtiTypeSchema, // 16가지 MBTI만 허용
  description: z.string().min(10),
  traits: z.array(z.string()).min(2).max(5),
});

const AiFortuneSchema = z.object({
  group: z.string().min(20),
  keywords: z.array(z.string()).min(2).max(5),
});

const AiHotTopicSchema = z.object({
  topic: z.string().min(3),
  description: z.string().min(10),
  frequency: z.number().optional(),
});

const AiHotTopicsSchema = z.object({
  hotTopics: z.array(AiHotTopicSchema).length(3),
});

const SYSTEM_PROMPT = `당신은 재미있고 유머러스한 채팅 로그 분석 AI입니다. 
중요 규칙:
1. 항상 유효한 JSON만 응답하세요.
2. 참여자 이름은 정확하게 사용하세요.
3. 개인 비방, 조롱, 관계 추측을 절대 하지 마세요.
4. 긍정적이고 재미있는 톤을 유지하세요.
5. 통계 데이터를 기반으로 객관적으로 분석하세요.`;

/**
 * OpenAI API 호출 헬퍼 (재시도 로직 포함)
 */
async function callOpenAIWithRetry<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  retries = 1,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7, // seed 고정을 위해 낮은 temperature
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      const parsed = JSON.parse(content);
      const validated = schema.parse(parsed);
      return validated;
    } catch (error) {
      if (attempt < retries) {
        console.warn(
          `OpenAI call failed (attempt ${attempt + 1}/${
            retries + 1
          }), retrying...`,
          error,
        );
        // 재시도 전에 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("All retry attempts failed");
}

/**
 * 톡방 MBTI 생성
 */
async function generateMbti(
  stats: RoomStatsData,
  participants: Array<{ displayName: string; alias: string }>,
  title: string | undefined,
  awards: Array<{ participant: string; title: string; description: string }>,
): Promise<AiMbti> {
  try {
    const prompt = buildMbtiPrompt({
      stats,
      participants,
      title,
      awards,
      seed: "",
    });
    const result = await callOpenAIWithRetry(prompt, AiMbtiSchema);
    return result as AiMbti;
  } catch (error) {
    console.error("MBTI generation failed:", error);
    // Fallback
    return {
      type: "ENFP",
      description: "활발하고 재미있는 대화가 많은 톡방이에요!",
      traits: ["활발한 소통", "감정 표현이 풍부함", "즐거운 분위기"],
    };
  }
}

/**
 * 단체 운세 생성 (seed 고정)
 */
async function generateFortune(
  stats: RoomStatsData,
  participants: Array<{ displayName: string; alias: string }>,
  title: string | undefined,
  seed: string,
): Promise<AiFortune> {
  try {
    const prompt = buildFortunePrompt({
      stats,
      participants,
      title,
      seed,
      awards: [],
    });
    const result = await callOpenAIWithRetry(prompt, AiFortuneSchema);
    return result as AiFortune;
  } catch (error) {
    console.error("Fortune generation failed:", error);
    // Fallback
    return {
      group: "새해에도 좋은 일만 가득하길 바랍니다!",
      keywords: ["행복", "건강", "성장"],
    };
  }
}

/**
 * 핫토픽 생성
 */
async function generateHotTopics(
  stats: RoomStatsData,
  participants: Array<{ displayName: string; alias: string }>,
  title: string | undefined,
  hotTopicCandidates?: string[],
): Promise<AiHotTopic[]> {
  try {
    const prompt = buildHotTopicsPrompt({
      stats,
      participants,
      title,
      hotTopicCandidates,
      seed: "",
      awards: [],
    });
    const result = await callOpenAIWithRetry(prompt, AiHotTopicsSchema);
    return result.hotTopics;
  } catch (error) {
    console.error("Hot topics generation failed:", error);
    // Fallback
    return [
      {
        topic: "일상 대화",
        description: "일상적인 대화가 주를 이루는 톡방이에요.",
        frequency: 0,
      },
      {
        topic: "소통",
        description: "활발한 소통이 이루어지는 톡방이에요.",
        frequency: 0,
      },
      {
        topic: "약속/일정",
        description: "약속, 일정, 계획 이야기가 자주 오간 톡방이에요.",
        frequency: 0,
      },
    ];
  }
}

/**
 * AI 엔터테인먼트 전체 생성 (MBTI + 단체 운세 + 핫토픽)
 */
export async function generateRoomAi(
  stats: RoomStatsData,
  participants: Array<{ displayName: string; alias: string }>,
  title: string | undefined,
  awards: Array<{ participant: string; title: string; description: string }>,
  shareSlug: string,
  hotTopicCandidates?: string[],
): Promise<AiEntertainment> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  // 병렬로 생성 (성능 향상)
  const [mbti, fortune, hotTopics] = await Promise.all([
    generateMbti(stats, participants, title, awards),
    generateFortune(stats, participants, title, shareSlug),
    generateHotTopics(stats, participants, title, hotTopicCandidates),
  ]);

  return {
    mbti,
    fortune,
    hotTopics,
  };
}
