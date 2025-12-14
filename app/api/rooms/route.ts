import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { AI_ENABLED, ROOM_TTL_DAYS, UPLOAD_MAX_BYTES } from "@/config/limits";
import { parseKakaoTxt } from "@/lib/kakao/parse";
import { computeStats } from "@/lib/kakao/stats";
import { generateRoomAi } from "@/lib/server/ai/generateRoomAi";
import { generateAISummary } from "@/lib/server/openai";
import { prisma } from "@/lib/server/prisma";
import { generateDeleteToken, generateShareSlug } from "@/lib/server/tokens";
import type { ParsedChat, RoomStatsData } from "@/types/analysis";

// Vercel serverless function timeout: 60 seconds (Pro plan) or 10 seconds (Hobby)
// For large files or AI generation, we need more time
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const toJson = (value: unknown): Prisma.InputJsonValue => {
      // Ensure we only persist JSON-serializable data (no Dates/undefined/functions)
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    };

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "MISSING_FILE", message: "파일이 필요합니다" },
        },
        { status: 400 },
      );
    }

    // Validate file type
    if (!file.name.endsWith(".txt")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_FILE_TYPE",
            message: ".txt 파일만 업로드 가능합니다",
          },
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > UPLOAD_MAX_BYTES) {
      const maxMB = Math.round(UPLOAD_MAX_BYTES / 1024 / 1024);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `파일 크기가 ${maxMB}MB를 초과합니다`,
          },
        },
        { status: 400 },
      );
    }

    // Read file content
    let content: string;
    try {
      const buffer = await file.arrayBuffer();
      content = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    } catch (error) {
      console.error("File read error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FILE_READ_FAILED",
            message: "파일을 읽는 데 실패했습니다",
          },
        },
        { status: 400 },
      );
    }

    // Parse chat
    let parsedChat: ParsedChat;
    try {
      parsedChat = parseKakaoTxt(content);
      // Privacy: do not log raw content or participant names.
      console.log("Parsed chat:", {
        messages: parsedChat.messages.length,
        participants: parsedChat.participants.length,
        hasTitle: Boolean(parsedChat.title),
      });
    } catch (error) {
      console.error("Parse error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PARSE_FAILED",
            message: "채팅 파일을 파싱하는 데 실패했습니다",
          },
        },
        { status: 400 },
      );
    }

    if (parsedChat.messages.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "EMPTY_CHAT",
            message: "파일에서 메시지를 찾을 수 없습니다",
          },
        },
        { status: 400 },
      );
    }

    if (parsedChat.participants.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NO_PARTICIPANTS",
            message:
              "파일에서 참여자를 찾을 수 없습니다. 유효한 카카오톡 내보내기 파일인지 확인해주세요.",
          },
        },
        { status: 400 },
      );
    }

    // Generate tokens with retry logic to avoid unique constraint violations
    let shareSlug: string = "";
    let deleteToken: string = "";
    let room: { id: string; shareSlug: string; deleteToken: string } | null =
      null;
    const MAX_RETRIES = 5;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      shareSlug = generateShareSlug();
      deleteToken = generateDeleteToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ROOM_TTL_DAYS);

      try {
        room = await prisma.room.create({
          data: {
            shareSlug,
            deleteToken,
            title: parsedChat.title || null,
            expiresAt,
            status: "processing",
          },
        });
        break; // Success, exit retry loop
      } catch (error) {
        // Check if it's a unique constraint violation
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          retries++;
          if (retries >= MAX_RETRIES) {
            console.error(
              "DB create error: max retries reached for unique constraint",
              {
                field: error.meta?.target,
              },
            );
            return NextResponse.json(
              {
                ok: false,
                error: {
                  code: "DB_FAILED",
                  message: "방 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
                },
              },
              { status: 500 },
            );
          }
          // Retry with new tokens
          continue;
        }

        // Prisma prepared statement 에러 처리 (재시도)
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string" &&
          (error.message.includes("prepared statement") ||
            error.message.includes("already exists"))
        ) {
          retries++;
          if (retries >= MAX_RETRIES) {
            console.error(
              "DB create error: max retries reached for prepared statement error",
            );
            return NextResponse.json(
              {
                ok: false,
                error: {
                  code: "DB_CONNECTION_ERROR",
                  message:
                    "데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                },
              },
              { status: 503 },
            );
          }
          // 재시도 전에 잠시 대기
          await new Promise((resolve) => setTimeout(resolve, 100 * retries));
          continue;
        }

        // Other database errors
        console.error("DB create error:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error("Prisma error code:", error.code);
          console.error("Prisma error meta:", error.meta);
        }
        return NextResponse.json(
          {
            ok: false,
            error: { code: "DB_FAILED", message: "방 생성에 실패했습니다" },
          },
          { status: 500 },
        );
      }
    }

    if (!room) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DB_FAILED",
            message: "방 생성에 실패했습니다",
          },
        },
        { status: 500 },
      );
    }

    // Compute stats
    let statsData: RoomStatsData;
    try {
      statsData = computeStats(parsedChat.messages, parsedChat.participants);
    } catch (error) {
      console.error("Stats error:", error);
      if (room) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: "failed", errorCode: "STATS_FAILED" },
        });
      }
      return NextResponse.json(
        {
          ok: false,
          error: { code: "STATS_FAILED", message: "통계 계산에 실패했습니다" },
        },
        { status: 500 },
      );
    }

    // Save participants
    try {
      if (room) {
        await prisma.roomParticipant.createMany({
          data: statsData.participants.map((p) => ({
            roomId: room.id,
            displayName: p.displayName,
            alias: p.alias,
          })),
        });
      }
    } catch (error) {
      console.error("Participants save error:", error);
    }

    // Save stats
    try {
      if (room) {
        await prisma.roomStats.create({
          data: {
            roomId: room.id,
            stats: toJson(statsData),
          },
        });
      }
    } catch (error) {
      console.error("Stats save error:", error);
      if (room) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: "failed", errorCode: "STATS_SAVE_FAILED" },
        });
      }
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "STATS_SAVE_FAILED",
            message: "통계 저장에 실패했습니다",
          },
        },
        { status: 500 },
      );
    }

    // Generate AI summary (if enabled)
    if (AI_ENABLED && room) {
      try {
        const participants = statsData.participants.map((p) => ({
          displayName: p.displayName,
          alias: p.alias,
        }));

        // 기존 AI 요약 생성 (awards, recap, fortune, highlights)
        const aiData = await generateAISummary(
          statsData,
          participants,
          parsedChat.title,
        );

        // 새로운 AI 엔터테인먼트 생성 (MBTI, 단체 운세, 핫토픽)
        try {
          const entertainment = await generateRoomAi(
            statsData,
            participants,
            parsedChat.title,
            statsData.fixedAwards,
            shareSlug,
            undefined, // hotTopicCandidates는 나중에 추가 가능
          );

          // AI 데이터에 엔터테인먼트 추가
          aiData.mbti = entertainment.mbti;
          aiData.groupFortune = entertainment.fortune;
          aiData.hotTopics = entertainment.hotTopics;
        } catch (entError) {
          console.error("AI entertainment generation error:", entError);
          // 엔터테인먼트 생성 실패해도 기존 AI 요약은 저장
        }

        await prisma.roomAI.create({
          data: {
            roomId: room.id,
            summary: toJson(aiData),
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          },
        });
      } catch (error) {
        console.error("AI generation error:", error);
        // Don't fail the request if AI fails
      }
    }

    // Update room status to ready
    if (room) {
      try {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: "ready" },
        });
      } catch (error) {
        console.error("Room update error:", error);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        shareSlug,
        deleteToken,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    // Log more details in production for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Prisma 에러 처리
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DB_CONFLICT",
            message: "중복된 데이터가 있습니다. 잠시 후 다시 시도해주세요.",
          },
        },
        { status: 409 },
      );
    }

    // Prisma prepared statement 에러 처리 (catch 블록에서 이미 처리했지만 여기서도 처리)
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      (error.message.includes("prepared statement") ||
        error.message.includes("already exists"))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DB_CONNECTION_ERROR",
            message:
              "데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "예기치 않은 오류가 발생했습니다",
        },
      },
      { status: 500 },
    );
  }
}
