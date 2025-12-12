import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { parseKakaoTxt } from "@/lib/kakao/parse";
import { computeStats } from "@/lib/kakao/stats";
import { generateAISummary } from "@/lib/server/openai";
import { generateShareSlug, generateDeleteToken } from "@/lib/server/tokens";
import { prisma } from "@/lib/server/prisma";
import { UPLOAD_MAX_BYTES, ROOM_TTL_DAYS, AI_ENABLED } from "@/config/limits";

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
        { status: 400 }
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
        { status: 400 }
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
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Parse chat
    let parsedChat;
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
        { status: 400 }
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
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Generate tokens
    const shareSlug = generateShareSlug();
    const deleteToken = generateDeleteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ROOM_TTL_DAYS);

    // Create room
    let room;
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
    } catch (error) {
      console.error("DB create error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DB_FAILED", message: "방 생성에 실패했습니다" },
        },
        { status: 500 }
      );
    }

    // Compute stats
    let statsData;
    try {
      statsData = computeStats(parsedChat.messages, parsedChat.participants);
    } catch (error) {
      console.error("Stats error:", error);
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "failed", errorCode: "STATS_FAILED" },
      });
      return NextResponse.json(
        {
          ok: false,
          error: { code: "STATS_FAILED", message: "통계 계산에 실패했습니다" },
        },
        { status: 500 }
      );
    }

    // Save participants
    try {
      await prisma.roomParticipant.createMany({
        data: statsData.participants.map((p) => ({
          roomId: room.id,
          displayName: p.displayName,
          alias: p.alias,
        })),
      });
    } catch (error) {
      console.error("Participants save error:", error);
    }

    // Save stats
    try {
      await prisma.roomStats.create({
        data: {
          roomId: room.id,
          stats: toJson(statsData),
        },
      });
    } catch (error) {
      console.error("Stats save error:", error);
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "failed", errorCode: "STATS_SAVE_FAILED" },
      });
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "STATS_SAVE_FAILED",
            message: "통계 저장에 실패했습니다",
          },
        },
        { status: 500 }
      );
    }

    // Generate AI summary (if enabled)
    if (AI_ENABLED) {
      try {
        const aiData = await generateAISummary(
          statsData,
          statsData.participants.map((p) => ({
            displayName: p.displayName,
            alias: p.alias,
          })),
          parsedChat.title
        );

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
    try {
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "ready" },
      });
    } catch (error) {
      console.error("Room update error:", error);
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
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "예기치 않은 오류가 발생했습니다",
        },
      },
      { status: 500 }
    );
  }
}
