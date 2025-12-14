"use client";

import { FileText, Settings, Upload } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { FireworksBackground } from "@/components/animate-ui/components/backgrounds/fireworks";

type UploadState = "idle" | "uploading" | "parsing" | "analyzing" | "done";

interface UploadApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

// FireworksBackground가 props 변화로 리셋되지 않도록 색상 배열을 고정
const FIREWORK_COLORS = [
  "#FF6B6B", // 빨강
  "#4ECDC4", // 청록
  "#45B7D1", // 파랑
  "#FFA07A", // 연어
  "#98D8C8", // 민트
  "#F7DC6F", // 노랑
  "#BB8FCE", // 보라
  "#85C1E2", // 하늘
] as const;

// 로딩 메시지 state 변경 시에도 폭죽이 리셋되지 않도록 memo 처리
const StableFireworksBackground = memo(function StableFireworksBackground({
  population,
}: {
  population: number;
}) {
  return (
    <FireworksBackground
      className="absolute inset-0"
      color={FIREWORK_COLORS as unknown as string[]}
      population={population}
    />
  );
});

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [_deleteToken, setDeleteToken] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [isLoadingMessageFading, setIsLoadingMessageFading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const messagesByState: Partial<Record<UploadState, string[]>> = {
      uploading: [
        "업로드 중...",
        "파일을 안전하게 전송하고 있어요",
        "조금만 기다려 주세요",
      ],
      parsing: [
        "파싱 중...",
        "채팅 로그를 읽고 있어요",
        "참여자와 시간 정보를 정리하고 있어요",
      ],
      analyzing: [
        "분석 중...",
        "통계를 계산하고 있어요",
        "올해의 하이라이트를 찾는 중이에요",
      ],
    };

    const list = messagesByState[state];
    if (!list || list.length === 0) {
      setLoadingMessage("");
      return;
    }

    let idx = 0;
    setLoadingMessage(list[idx]);
    const id = window.setInterval(() => {
      idx = (idx + 1) % list.length;
      // 메시지만 부드럽게 바뀌도록 페이드 처리
      setIsLoadingMessageFading(true);
      window.setTimeout(() => {
        setLoadingMessage(list[idx]);
        setIsLoadingMessageFading(false);
      }, 180);
    }, 2000);

    return () => window.clearInterval(id);
  }, [state]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      toast.error(".txt 파일만 업로드 가능합니다");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setState("uploading");
      setProgress(20);

      const response = await fetch("/api/rooms", {
        method: "POST",
        body: formData,
      });

      setProgress(40);
      setState("parsing");

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorData: UploadApiErrorResponse | null = null;
        try {
          const text = await response.text();
          if (text) {
            errorData = JSON.parse(text) as UploadApiErrorResponse;
          }
        } catch (parseError) {
          // If JSON parsing fails, use status text
          console.error("Failed to parse error response:", parseError);
          throw new Error(
            `서버 오류 (${response.status}): ${
              response.statusText || "알 수 없는 오류"
            }`,
          );
        }

        // 에러 데이터가 없거나 빈 객체인 경우 처리
        const errorMsg =
          errorData?.error?.message ||
          errorData?.error?.code ||
          errorData?.message ||
          `서버 오류 (${response.status})`;

        console.error("Upload error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          hasError: !!errorData,
          errorKeys: errorData ? Object.keys(errorData) : [],
        });

        // 에러 메시지가 없으면 기본 메시지 사용
        const finalErrorMsg = errorMsg || `서버 오류 (${response.status})`;
        throw new Error(finalErrorMsg);
      }

      const result = await response.json();

      if (!result.ok) {
        const errorMsg =
          result.error?.message || result.error?.code || "업로드 실패";
        console.error("Upload error:", result.error);
        throw new Error(errorMsg);
      }

      setProgress(60);
      setState("analyzing");

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProgress(100);
      setState("done");
      setShareSlug(result.data.shareSlug);
      setDeleteToken(result.data.deleteToken);

      toast.success("업로드 완료! 채팅 분석이 완료되었습니다.");
    } catch (error) {
      setState("idle");
      setProgress(0);
      toast.error(
        error instanceof Error ? error.message : "오류가 발생했습니다",
      );
    }
  };

  const handleShare = async () => {
    if (!shareSlug) return;

    const url = `${window.location.origin}/r/${shareSlug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "YearTalk - 채팅 회고",
          text: "내 채팅 회고를 확인해보세요!",
          url,
        });
      } catch (_error) {
        // User cancelled or error
        await navigator.clipboard.writeText(url);
        toast.success("링크가 클립보드에 복사되었습니다!");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("링크가 클립보드에 복사되었습니다!");
    }
  };

  const handleViewResults = () => {
    if (shareSlug) {
      window.location.href = `/r/${shareSlug}`;
    }
  };

  // 모바일에서 성능을 위해 폭죽 개수 조정
  const fireworksPopulation = isMobile ? 3 : 5;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-3 sm:p-4 overflow-hidden">
      <StableFireworksBackground population={fireworksPopulation} />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-card/95 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold mb-2">YearTalk</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            카카오톡 내보내기 파일을 업로드하여
            <br className="sm:hidden" /> 재미있는 회고를 만들어보세요
          </p>
        </div>
        <div className="space-y-6">
          {state === "idle" && (
            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 sm:p-8 min-h-[180px] sm:min-h-[200px] transition-colors active:border-muted-foreground/50 touch-manipulation"
              >
                <Upload className="mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                <span className="text-sm sm:text-base font-medium mb-1">
                  클릭하여 업로드
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  .txt 파일만 가능
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="text-xs sm:text-sm font-medium">
                  카카오톡 내보내기 경로
                </p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  카카오톡 톡방 &gt;{" "}
                  <Settings
                    className="inline-block h-4 w-4 align-text-bottom text-muted-foreground"
                    aria-hidden="true"
                  />{" "}
                  설정 &gt; 내보내기 선택 &gt; 받은 txt파일 올리기
                </p>
              </div>
            </div>
          )}

          {state !== "idle" && state !== "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                <span
                  className={[
                    "text-sm sm:text-base font-medium transition-opacity duration-300",
                    isLoadingMessageFading ? "opacity-40" : "opacity-100",
                  ].join(" ")}
                >
                  {loadingMessage ||
                    (state === "uploading"
                      ? "업로드 중..."
                      : state === "parsing"
                        ? "파싱 중..."
                        : "분석 중...")}
                </span>
              </div>
              <div className="relative h-3 sm:h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {state === "done" && shareSlug && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 sm:p-5 text-center">
                <p className="text-sm sm:text-base font-medium">분석 완료!</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  채팅 회고가 준비되었습니다
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleViewResults}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm sm:text-base font-medium text-primary-foreground active:bg-primary/90 h-12 sm:h-11 w-full touch-manipulation"
                >
                  결과 보기
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm sm:text-base font-medium active:bg-accent active:text-accent-foreground h-12 sm:h-11 w-full touch-manipulation"
                >
                  링크 공유
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
