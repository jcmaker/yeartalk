import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const room = await prisma.room.findUnique({
      where: { shareSlug: slug },
      include: {
        participants: true,
        stats: true,
        ai: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "방을 찾을 수 없습니다" },
        },
        { status: 404 },
      );
    }

    if (room.status !== "ready") {
      const statusMessages: Record<string, string> = {
        processing: "처리 중",
        failed: "실패",
      };
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_READY",
            message: `방 상태: ${statusMessages[room.status] || room.status}`,
          },
        },
        { status: 202 },
      );
    }

    // Return public payload (NO delete_token)
    return NextResponse.json({
      ok: true,
      data: {
        id: room.id,
        shareSlug: room.shareSlug,
        title: room.title,
        createdAt: room.createdAt.toISOString(),
        expiresAt: room.expiresAt?.toISOString() || null,
        participants: room.participants.map((p) => ({
          displayName: p.displayName,
          alias: p.alias,
        })),
        stats: room.stats?.stats || null,
        ai: room.ai
          ? {
              summary: room.ai.summary,
              generatedAt: room.ai.generatedAt.toISOString(),
              model: room.ai.model,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "예기치 않은 오류가 발생했습니다",
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "MISSING_TOKEN", message: "삭제 토큰이 필요합니다" },
        },
        { status: 400 },
      );
    }

    // Find room and verify token
    const room = await prisma.room.findUnique({
      where: { shareSlug: slug },
    });

    if (!room) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "방을 찾을 수 없습니다" },
        },
        { status: 404 },
      );
    }

    if (room.deleteToken !== token) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_TOKEN",
            message: "유효하지 않은 삭제 토큰입니다",
          },
        },
        { status: 403 },
      );
    }

    // Delete room (cascade will handle related records)
    await prisma.room.delete({
      where: { id: room.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "예기치 않은 오류가 발생했습니다",
        },
      },
      { status: 500 },
    );
  }
}
