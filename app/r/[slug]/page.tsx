"use client";

import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowDown, ArrowUp, Award, BarChart3, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GradientBackground } from "@/components/animate-ui/components/backgrounds/gradient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface RoomData {
  id: string;
  shareSlug: string;
  title: string | null;
  createdAt: string;
  expiresAt: string | null;
  participants: Array<{
    displayName: string;
    alias: string;
  }>;
  stats: {
    totalMessages: number;
    totalAttachments: number;
    participants: Array<{
      displayName: string;
      alias: string;
      messageCount: number;
      attachmentCount: number;
      topTokens: {
        laughter: number;
        cry: number;
        punctuation: number;
      };
    }>;
    activity: {
      byHour: Record<string, number>;
      byWeekday: Record<string, number>;
    };
    fixedAwards: Array<{
      participant: string;
      title: string;
      description: string;
    }>;
    bursts: Array<{
      start: string;
      end: string;
      messageCount: number;
    }>;
  } | null;
  ai: {
    summary: {
      awards: Array<{
        participant: string;
        title: string;
        description: string;
      }>;
      recap: string;
      fortune: Array<{
        participant: string;
        prediction: string;
      }>;
      highlights: string[];
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
    };
    generatedAt: string;
    model: string;
  } | null;
}

// 개인 운세 캐러셀(상장처럼 좌우) - 5인 이하에서만 사용
function FortuneCarousel({
  fortune,
  stats,
  getFortuneTheme,
}: {
  fortune: Array<{
    participant: string;
    prediction: string;
  }>;
  stats: {
    participants: Array<{
      displayName: string;
      alias: string;
      messageCount: number;
      attachmentCount: number;
      topTokens: {
        laughter: number;
        cry: number;
        punctuation: number;
      };
    }>;
  };
  getFortuneTheme: (seed: string) => {
    ring: string;
    label: string;
    glow: string;
  };
}) {
  const fortuneCards = fortune.map((f, idx) => {
    const participant = stats.participants.find(
      (p) => p.displayName === f.participant || p.alias === f.participant,
    );
    return {
      name: participant?.displayName || f.participant,
      alias: participant?.alias ?? `${idx + 1}`,
      prediction: f.prediction,
    };
  });

  const carouselOptions: EmblaOptionsType = {
    loop: false,
    align: "center",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    axis: "x",
  };

  const [emblaRef, emblaApi] = useEmblaCarousel(carouselOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const updateSelectedIndex = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", updateSelectedIndex);
    updateSelectedIndex();
    return () => {
      emblaApi.off("select", updateSelectedIndex);
    };
  }, [emblaApi]);

  return (
    <div className="h-screen shrink-0 w-full overflow-hidden relative flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-6 shrink-0 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl bg-card/70 backdrop-blur-md px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground/75">
                  참여자 {fortuneCards.length.toLocaleString()}명
                </p>
                <p className="mt-1 text-sm sm:text-base">
                  <span className="font-semibold">개인 운세</span>
                  <span className="text-muted-foreground/70">
                    {" "}
                    · 좌우로 넘겨서 확인하세요
                  </span>
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-background/25 px-2 py-1">
                <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                  {selectedIndex + 1}/{fortuneCards.length}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-3 flex items-center justify-center gap-1.5 text-muted-foreground/60">
            {Array.from(
              { length: fortuneCards.length },
              (_, dot) => dot + 1,
            ).map((dot) => (
              <div
                key={dot}
                className={[
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  dot - 1 === selectedIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
                ].join(" ")}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-3 overflow-hidden relative z-10">
        <div className="max-w-2xl mx-auto h-full">
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full">
              {fortuneCards.map((t, idx) => (
                <div
                  key={`${t.alias}-${idx}`}
                  className="flex-[0_0_100%] w-full h-full flex items-center justify-center"
                >
                  <div className="w-full">
                    <Card
                      className={[
                        "relative overflow-hidden rounded-2xl border ring-1",
                        "bg-zinc-950/70 backdrop-blur-md",
                        getFortuneTheme(`${t.alias}-${t.name}`).ring,
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full blur-2xl",
                          "bg-linear-to-br",
                          getFortuneTheme(`${t.alias}-${t.name}`).glow,
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <CardHeader className="pb-2 px-4 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base sm:text-lg tracking-tight truncate">
                              {t.name}{" "}
                              <span className="text-muted-foreground/70 text-sm font-normal">
                                ({t.alias})
                              </span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                              올해의 기록으로 본 내년의 힌트
                            </CardDescription>
                          </div>
                          <div
                            className={[
                              "shrink-0 rounded-full px-2 py-1 text-[11px] tabular-nums",
                              getFortuneTheme(`${t.alias}-${t.name}`).label,
                            ].join(" ")}
                          >
                            #{idx + 1}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-foreground/95">
                          {t.prediction}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 상장 캐러셀 컴포넌트
function AwardsCarousel({
  awards,
  stats,
  mainEmblaApi,
}: {
  awards: Array<{
    participant: string;
    title: string;
    description: string;
  }>;
  stats: {
    participants: Array<{
      displayName: string;
      alias: string;
      messageCount: number;
      attachmentCount: number;
      topTokens: {
        laughter: number;
        cry: number;
        punctuation: number;
      };
    }>;
  };
  mainEmblaApi: EmblaCarouselType | undefined;
}) {
  const stripAwardEmoji = (title: string) => {
    return title
      .replace(/[✅⚡😂📸😺🌙]/gu, "")
      .replace(/\uFE0F/g, "")
      .trim();
  };

  const getAwardTheme = (title: string) => {
    // 카드 배경/보더에 은은한 컬러를 부여 (dark 모드 기준)
    if (title.includes("출석왕")) {
      return {
        card: "border-emerald-300/30 ring-emerald-300/65",
        iconWrap: "bg-emerald-500/30 ring-emerald-300/60",
        bar: "bg-emerald-300",
        descBox: "bg-emerald-500/8 ring-emerald-300/15",
        seal: "bg-emerald-500/80 ring-emerald-300/15",
      } as const;
    }
    if (title.includes("칼답")) {
      return {
        card: "border-amber-300/30 ring-amber-300/65",
        iconWrap: "bg-amber-500/30 ring-amber-300/60",
        bar: "bg-amber-300",
        descBox: "bg-amber-500/8 ring-amber-300/15",
        seal: "bg-amber-500/80 ring-amber-300/15",
      } as const;
    }
    if (title.includes("새벽")) {
      return {
        card: "border-violet-300/30 ring-violet-300/65",
        iconWrap: "bg-violet-500/30 ring-violet-300/60",
        bar: "bg-violet-300",
        descBox: "bg-violet-500/8 ring-violet-300/15",
        seal: "bg-violet-500/80 ring-violet-300/15",
      } as const;
    }
    if (title.includes("이모티콘")) {
      return {
        card: "border-fuchsia-300/30 ring-fuchsia-300/65",
        iconWrap: "bg-fuchsia-500/30 ring-fuchsia-300/60",
        bar: "bg-fuchsia-300",
        descBox: "bg-fuchsia-500/8 ring-fuchsia-300/15",
        seal: "bg-fuchsia-500/80 ring-fuchsia-300/15",
      } as const;
    }
    if (title.includes("사진") || title.includes("짤")) {
      return {
        card: "border-sky-300/30 ring-sky-300/65",
        iconWrap: "bg-sky-500/30 ring-sky-300/60",
        bar: "bg-sky-300",
        descBox: "bg-sky-500/8 ring-sky-300/15",
        seal: "bg-sky-500/80 ring-sky-300/15",
      } as const;
    }
    // 웃음요정상 (default)
    return {
      card: "border-rose-300/30 ring-rose-300/65",
      iconWrap: "bg-rose-500/30 ring-rose-300/60",
      bar: "bg-rose-300",
      descBox: "bg-rose-500/8 ring-rose-300/15",
      seal: "bg-rose-500/80 ring-rose-300/15",
    } as const;
  };

  const getAwardIconSrc = (title: string): string => {
    if (title.includes("출석왕")) return "/yeartalk_first.svg";
    if (title.includes("칼답")) return "/yeartalk_knife.svg";
    if (title.includes("새벽")) return "/yeartalk_moon.svg";
    if (title.includes("이모티콘")) return "/yeartalk_imoji.svg";
    if (title.includes("사진") || title.includes("짤"))
      return "/yeartalk_camera.svg";
    if (title.includes("웃음") || title.includes("요정"))
      return "/yeartalk_smile.svg";
    return "/yeartalk_smile.svg";
  };

  const carouselOptions: EmblaOptionsType = {
    loop: true,
    align: "center",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    axis: "x", // 가로 스크롤
  };

  const [emblaRef, emblaApi] = useEmblaCarousel(carouselOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVerticalSwipe, setIsVerticalSwipe] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const updateSelectedIndex = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", updateSelectedIndex);
    updateSelectedIndex();

    return () => {
      emblaApi.off("select", updateSelectedIndex);
    };
  }, [emblaApi]);

  // 세로 스와이프를 가로 스크롤로 변환
  useEffect(() => {
    if (!emblaApi) return;

    let startY = 0;
    let startX = 0;
    let isScrolling = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isScrolling = false;
      setIsVerticalSwipe(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;

      // 세로 스와이프가 가로보다 크면 세로 스와이프로 인식
      if (
        Math.abs(deltaY) > Math.abs(deltaX) &&
        Math.abs(deltaY) > 30 &&
        !isScrolling
      ) {
        isScrolling = true;
        setIsVerticalSwipe(true);
        e.preventDefault();

        if (deltaY > 0) {
          // 아래로 스와이프 -> 오른쪽으로 스크롤
          emblaApi.scrollNext();
        } else {
          // 위로 스와이프 -> 왼쪽으로 스크롤
          emblaApi.scrollPrev();
        }
      }
    };

    const container = emblaApi.containerNode();
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [emblaApi]);

  // 세로 스와이프 감지하여 다음 섹션으로 (무한 루프이므로 마지막 체크 제거)
  useEffect(() => {
    if (!emblaApi || !mainEmblaApi) return;

    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isVerticalSwipe) return;

      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - startY;
      const deltaTime = Date.now() - startTime;

      // 아래로 빠르게 스와이프하면 다음 섹션으로
      if (deltaY > 80 && deltaTime < 400) {
        mainEmblaApi.scrollNext();
      }
    };

    const container = emblaApi.containerNode();
    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [emblaApi, mainEmblaApi, isVerticalSwipe]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="overflow-hidden w-full" ref={emblaRef}>
        <div className="flex">
          {awards.map((award, idx) => {
            const participant = stats.participants.find(
              (p) =>
                p.displayName === award.participant ||
                p.alias === award.participant,
            );
            const displayName = participant?.displayName || award.participant;
            const awardIconSrc = getAwardIconSrc(award.title);
            const awardTitle = stripAwardEmoji(award.title);
            const awardTheme = getAwardTheme(awardTitle);

            return (
              <div
                key={`${award.participant}-${award.title}`}
                className="flex-[0_0_100%] w-full h-screen flex items-center justify-center"
              >
                <div className="w-full max-w-2xl px-4 sm:px-6">
                  <div className="h-screen flex flex-col items-center justify-center">
                    <div className="w-full max-w-sm">
                      {/* 카드 뒤 배경(블러+딤)으로 그라디언트 간섭 최소화 */}
                      <div className="relative">
                        <div className="absolute inset-0 rounded-3xl bg-black/5 backdrop-blur-2xl shadow-2xl" />
                        <Card
                          className={[
                            "relative rounded-3xl min-h-[560px] flex flex-col border ring-1 shadow-xl",
                            // 카드 자체 베이스를 충분히 불투명하게(배경 그라디언트 영향 최소화)
                            "bg-zinc-950/75",
                            awardTheme.card,
                          ].join(" ")}
                        >
                          <CardHeader className="px-6 pt-8 pb-4">
                            <div className="flex flex-col items-center gap-3 min-w-0">
                              <div
                                className={[
                                  "h-24 w-24 rounded-3xl overflow-hidden shrink-0 flex items-center justify-center shadow-sm ring-1",
                                  awardTheme.iconWrap,
                                ].join(" ")}
                              >
                                <Image
                                  src={awardIconSrc}
                                  alt={`${awardTitle} 아이콘`}
                                  width={96}
                                  height={96}
                                  className="h-full w-full object-contain p-3"
                                  priority={idx === 0}
                                />
                              </div>
                              <div className="min-w-0">
                                <CardTitle className="text-lg sm:text-xl tracking-tight truncate text-center">
                                  {awardTitle}
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm text-center">
                                  {displayName}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="px-6 pb-8 grow flex flex-col">
                            <div className="mt-1 flex justify-center">
                              <div
                                className={[
                                  "h-1 w-14 rounded-full",
                                  awardTheme.bar,
                                ].join(" ")}
                              />
                            </div>

                            <div className="mt-6 grow flex items-center">
                              <div
                                className={[
                                  "w-full rounded-2xl ring-1 px-5 py-5",
                                  awardTheme.descBox,
                                ].join(" ")}
                              >
                                <p className="text-sm sm:text-base leading-relaxed text-muted-foreground/85 text-center whitespace-pre-wrap">
                                  {award.description}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 flex items-center justify-center">
                              <div
                                className={[
                                  "rounded-full ring-1 px-3 py-1",
                                  awardTheme.seal,
                                ].join(" ")}
                              >
                                <p className="text-[10px] tracking-[0.2em] text-muted-foreground/70">
                                  YEARTALK AWARD
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col items-center gap-2 text-muted-foreground/60">
                      <p className="text-xs">좌우로 스와이프하여 다음 상장</p>
                      <div
                        className="flex items-center gap-1.5"
                        aria-hidden="true"
                      >
                        {Array.from(
                          { length: awards.length },
                          (_, dot) => dot + 1,
                        ).map((dot) => (
                          <div
                            key={dot}
                            className={[
                              "h-1.5 w-1.5 rounded-full transition-colors",
                              dot - 1 === selectedIndex
                                ? "bg-primary"
                                : "bg-muted-foreground/30",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SwipeHint = ({
  label = "위로 스와이프하여 다음으로",
}: {
  label?: string;
}) => {
  return (
    <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground/70">
      <ArrowUp className="h-4 w-4 animate-bounce" aria-hidden="true" />
      <span className="tracking-tight">{label}</span>
    </div>
  );
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const OPTIONS = useMemo<EmblaOptionsType>(
    () => ({
      loop: false,
      align: "start",
      dragFree: false,
      axis: "y", // 세로 스크롤
      // Allow inner scroll areas (long participant lists etc.)
      watchDrag: (_emblaApi, evt) => {
        const target = (evt as Event).target as HTMLElement | null;
        if (!target?.closest) return true;
        return !target.closest('[data-embla-no-drag="true"]');
      },
    }),
    [],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(OPTIONS);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${slug}`);
        const result = await response.json();

        if (!result.ok || !result.data) {
          notFound();
          return;
        }

        setRoom(result.data as RoomData);
      } catch (error) {
        console.error("Failed to fetch room:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [slug]);

  useEffect(() => {
    if (emblaApi && room) {
      emblaApi.reInit();
    }
  }, [emblaApi, room]);

  useEffect(() => {
    if (!emblaApi) return;

    const handleSelect = () => {
      setCurrentSlide(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", handleSelect);
    handleSelect();

    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi]);

  // 다크 모드 강제 적용
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  const formatSeoulTime = useCallback((tsIso: string) => {
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(tsIso));
    } catch {
      return "";
    }
  }, []);

  const formatWeekdayKo = (weekdayIndex: number) => {
    const map = ["일", "월", "화", "수", "목", "금", "토"];
    return map[weekdayIndex] ?? "";
  };

  const formatHourKo = (hour: number) => {
    if (!Number.isFinite(hour)) return "";
    return `${hour}시`;
  };

  // 훅 순서 고정: room/stats 로드 전에도 항상 호출되도록 위로 올림
  const statsInsights = useMemo(() => {
    const s = room?.stats;
    if (!s) {
      return {
        participantsCount: 0,
        totalMessages: 0,
        topHour: null as null | { hour: number; count: number },
        topWeekday: null as null | { weekday: number; count: number },
        topBurst: null as null | {
          messageCount: number;
          start: string;
          end: string;
        },
      };
    }

    const entriesHour = Object.entries(s.activity.byHour || {});
    const entriesWeekday = Object.entries(s.activity.byWeekday || {});

    const pickTop = (entries: Array<[string, number]>) => {
      let bestKey: string | null = null;
      let bestValue = -Infinity;
      for (const [k, v] of entries) {
        if (typeof v !== "number") continue;
        if (v > bestValue) {
          bestValue = v;
          bestKey = k;
        }
      }
      return bestKey && bestValue >= 0
        ? { key: bestKey, value: bestValue }
        : null;
    };

    const topHour = pickTop(entriesHour);
    const topWeekday = pickTop(entriesWeekday);
    const topBurst = [...(s.bursts || [])].sort(
      (a, b) => b.messageCount - a.messageCount,
    )[0];

    const topHourNum = topHour ? Number.parseInt(topHour.key, 10) : null;
    const topWeekdayNum = topWeekday
      ? Number.parseInt(topWeekday.key, 10)
      : null;

    return {
      participantsCount: s.participants.length,
      totalMessages: s.totalMessages,
      topHour:
        topHour && topHourNum !== null && !Number.isNaN(topHourNum)
          ? { hour: topHourNum, count: topHour.value }
          : null,
      topWeekday:
        topWeekday && topWeekdayNum !== null && !Number.isNaN(topWeekdayNum)
          ? { weekday: topWeekdayNum, count: topWeekday.value }
          : null,
      topBurst: topBurst
        ? {
            messageCount: topBurst.messageCount,
            start: formatSeoulTime(topBurst.start),
            end: formatSeoulTime(topBurst.end),
          }
        : null,
    };
  }, [room?.stats, formatSeoulTime]);

  const getFortuneTheme = (seed: string) => {
    const palette = [
      {
        ring: "ring-emerald-300/25 border-emerald-300/25",
        label: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/25",
        glow: "from-emerald-400/18 via-teal-300/10 to-transparent",
      },
      {
        ring: "ring-sky-300/25 border-sky-300/25",
        label: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/25",
        glow: "from-sky-400/18 via-cyan-300/10 to-transparent",
      },
      {
        ring: "ring-violet-300/25 border-violet-300/25",
        label: "bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/25",
        glow: "from-violet-400/18 via-fuchsia-300/10 to-transparent",
      },
      {
        ring: "ring-amber-300/25 border-amber-300/25",
        label: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/25",
        glow: "from-amber-400/18 via-orange-300/10 to-transparent",
      },
      {
        ring: "ring-rose-300/25 border-rose-300/25",
        label: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/25",
        glow: "from-rose-400/18 via-pink-300/10 to-transparent",
      },
    ] as const;

    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return palette[h % palette.length];
  };

  const shareUrl = useMemo(() => {
    if (!slug) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/r/${slug}`;
  }, [slug]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareHint("링크를 복사했어요");
      window.setTimeout(() => setShareHint(null), 1800);
    } catch {
      setShareHint("복사에 실패했어요");
      window.setTimeout(() => setShareHint(null), 1800);
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    const title = room?.title
      ? `${room.title} · YearTalk`
      : "YearTalk 연말결산";
    const text = "올해 톡방 연말결산을 공유해요";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      await handleCopyShareLink();
    } catch {
      // 사용자가 공유 UI를 닫는 등은 무시
    }
  }, [handleCopyShareLink, room?.title, shareUrl]);

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  const stats = room.stats;
  const ai = room.ai?.summary;

  if (!stats) {
    notFound();
    return null;
  }

  // 고정 상장(상장도 고정) - AI와 무관하게 항상 표시
  const fixedAwards = stats.fixedAwards || [];

  const chunk = <T,>(items: T[], size: number): T[][] => {
    if (size <= 0) return [items];
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      out.push(items.slice(i, i + size));
    }
    return out;
  };

  const participantsSorted = [...stats.participants].sort(
    (a, b) => b.messageCount - a.messageCount,
  );
  const maxMessages = Math.max(
    ...participantsSorted.map((p) => p.messageCount),
    1,
  );
  const topParticipantOverall = participantsSorted[0] ?? null;

  const participantsPages = chunk(participantsSorted, 8);

  const topBy = (
    key: "laughter" | "cry" | "punctuation",
  ): (typeof stats.participants)[number] | null => {
    if (stats.participants.length === 0) return null;
    return stats.participants.reduce((best, cur) => {
      return cur.topTokens[key] > best.topTokens[key] ? cur : best;
    }, stats.participants[0]);
  };

  const topLaughter = topBy("laughter");
  const topCry = topBy("cry");
  const topPunctuation = topBy("punctuation");

  // 슬라이드 구성 - 안내와 콘텐츠를 분리
  const slides = [
    // Welcome 슬라이드
    {
      id: "welcome",
      type: "welcome" as const,
      content: null,
    },
    // 통계 안내 슬라이드
    {
      id: "stats-intro",
      type: "stats-intro" as const,
      content: null,
    },
    // 참여자 랭킹 (여러 페이지로 분리 - 스크롤 없이 전부 보기)
    ...participantsPages.map((page, pageIndex) => ({
      id: `stats-participants-${pageIndex}`,
      type: "stats-participants" as const,
      content: {
        pageIndex,
        pageCount: participantsPages.length,
        totalParticipants: participantsSorted.length,
        maxMessages,
        topParticipant: topParticipantOverall,
        participants: page,
      },
    })),
    // 자주 쓰는 표현 (별도 화면)
    {
      id: "stats-tokens",
      type: "stats-tokens" as const,
      content: {
        totalParticipants: participantsSorted.length,
        topLaughter,
        topCry,
        topPunctuation,
      },
    },
    // 상장 안내 슬라이드
    ...(fixedAwards.length > 0
      ? [
          {
            id: "awards-intro",
            type: "awards-intro" as const,
            content: null,
          },
        ]
      : []),
    // 상장 콘텐츠 슬라이드
    ...(fixedAwards.length > 0
      ? [
          {
            id: "awards",
            type: "awards" as const,
            content: fixedAwards,
          },
        ]
      : []),
    // 개인 운세(5인 이하에서만)
    ...(stats.participants.length <= 5 && ai?.fortune && ai.fortune.length > 0
      ? [
          {
            id: "fortune-intro",
            type: "fortune-intro" as const,
            content: null,
          },
        ]
      : []),
    ...(stats.participants.length <= 5 && ai?.fortune && ai.fortune.length > 0
      ? [
          {
            id: "fortune",
            type: "fortune" as const,
            content: ai.fortune,
          },
        ]
      : []),
    // 단체 운세(개인 운세 다음에 배치)
    ...(ai?.groupFortune
      ? [
          {
            id: "group-fortune-intro",
            type: "group-fortune-intro" as const,
            content: null,
          },
        ]
      : []),
    ...(ai?.groupFortune
      ? [
          {
            id: "group-fortune",
            type: "group-fortune" as const,
            content: ai.groupFortune,
          },
        ]
      : []),
    // MBTI (단체 운세 다음)
    ...(ai?.mbti
      ? [
          {
            id: "mbti-intro",
            type: "mbti-intro" as const,
            content: null,
          },
        ]
      : []),
    ...(ai?.mbti
      ? [
          {
            id: "mbti",
            type: "mbti" as const,
            content: ai.mbti,
          },
        ]
      : []),
    // 핫토픽 안내 슬라이드
    ...(ai?.hotTopics && ai.hotTopics.length > 0
      ? [
          {
            id: "hot-topics-intro",
            type: "hot-topics-intro" as const,
            content: null,
          },
        ]
      : []),
    // 핫토픽 콘텐츠 슬라이드
    ...(ai?.hotTopics && ai.hotTopics.length > 0
      ? [
          {
            id: "hot-topics",
            type: "hot-topics" as const,
            content: ai.hotTopics,
          },
        ]
      : []),
    // 공유 슬라이드 (마지막)
    {
      id: "share",
      type: "share" as const,
      content: null,
    },
  ];

  const totalSlides = slides.length;
  const slideProgressValue =
    totalSlides > 1 ? (currentSlide / (totalSlides - 1)) * 100 : 0;

  const currentSlideType = slides[currentSlide]?.type;
  const progressTheme = (() => {
    switch (currentSlideType) {
      case "stats-intro":
      case "stats-participants":
      case "stats-tokens":
        return {
          track: "bg-sky-500/10",
          fill: "bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300",
          pill: "bg-sky-500/10 text-sky-200",
        } as const;
      case "awards-intro":
      case "awards":
        return {
          track: "bg-amber-500/10",
          fill: "bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300",
          pill: "bg-amber-500/10 text-amber-200",
        } as const;
      case "fortune-intro":
      case "fortune":
        return {
          track: "bg-violet-500/10",
          fill: "bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300",
          pill: "bg-violet-500/10 text-violet-200",
        } as const;
      default:
        return {
          track: "bg-emerald-500/10",
          fill: "bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-300",
          pill: "bg-emerald-500/10 text-emerald-200",
        } as const;
    }
  })();

  const renderSlide = (slide: (typeof slides)[number]) => {
    if (slide.type === "welcome") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-3">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                당신의 채팅을 한 해 이야기로 정리했어요
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                {room.title || "채팅 회고"}
              </h1>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-background/35 px-3 py-2">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  메시지
                </p>
                <p className="text-lg sm:text-xl font-semibold tracking-tight">
                  {stats.totalMessages.toLocaleString()}개
                </p>
              </div>
              <div className="rounded-xl bg-background/35 px-3 py-2">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  첨부
                </p>
                <p className="text-lg sm:text-xl font-semibold tracking-tight">
                  {stats.totalAttachments.toLocaleString()}개
                </p>
              </div>
            </div>

            <div className="pt-6">
              <SwipeHint label="위로 스와이프하여 시작" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "stats-intro") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                이제 숫자로 이야기를 풀어볼게요
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                통계
              </h2>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  참여자
                </p>
                <p className="mt-1 text-lg sm:text-xl font-semibold tracking-tight tabular-nums">
                  {statsInsights.participantsCount.toLocaleString()}명
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  메시지
                </p>
                <p className="mt-1 text-lg sm:text-xl font-semibold tracking-tight tabular-nums">
                  {statsInsights.totalMessages.toLocaleString()}개
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  피크 시간
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold tracking-tight">
                  {statsInsights.topHour
                    ? `${formatHourKo(
                        statsInsights.topHour.hour,
                      )} · ${statsInsights.topHour.count.toLocaleString()}`
                    : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  피크 요일
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold tracking-tight">
                  {statsInsights.topWeekday
                    ? `${formatWeekdayKo(
                        statsInsights.topWeekday.weekday,
                      )}요일 · ${statsInsights.topWeekday.count.toLocaleString()}`
                    : "-"}
                </p>
              </div>
            </div>

            {statsInsights.topBurst ? (
              <div className="rounded-2xl bg-background/25 px-4 py-3 text-left">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  가장 뜨거웠던 5분
                </p>
                <p className="mt-1 text-sm sm:text-base">
                  <span className="font-semibold tabular-nums">
                    {statsInsights.topBurst.messageCount.toLocaleString()}개
                  </span>
                  <span className="text-muted-foreground/70">
                    {" "}
                    · {statsInsights.topBurst.start} ~{" "}
                    {statsInsights.topBurst.end}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="pt-2">
              <SwipeHint label="위로 스와이프하여 통계 보기" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "stats-participants" && slide.content) {
      const c = slide.content;
      const pageStartRank = c.pageIndex * 8;

      return (
        <div className="h-screen shrink-0 w-full overflow-hidden flex flex-col relative">
          <div className="px-4 sm:px-6 pt-4 pb-3 shrink-0 relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl bg-card/70 backdrop-blur-md px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground/75">
                      참여자 랭킹 · {c.totalParticipants.toLocaleString()}명
                    </p>
                    {c.topParticipant && (
                      <p className="mt-1 text-sm sm:text-base">
                        <span className="text-muted-foreground/70">1위 </span>
                        <span className="font-semibold">
                          {c.topParticipant.displayName}
                        </span>
                        <span className="text-muted-foreground/70">
                          {" "}
                          ({c.topParticipant.alias}) ·{" "}
                          {c.topParticipant.messageCount.toLocaleString()}개
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 rounded-full bg-background/25 px-2 py-1">
                    <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                      {c.pageIndex + 1}/{c.pageCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 sm:px-6 pb-4 overflow-hidden relative z-10">
            <div className="max-w-2xl mx-auto h-full flex flex-col">
              <div className="flex-1 rounded-2xl bg-card/70 backdrop-blur-md p-3 sm:p-4 overflow-hidden">
                <div className="h-full flex flex-col justify-between gap-2">
                  {c.participants.map((p, idx) => {
                    const rank = pageStartRank + idx + 1;
                    const widthPct = Math.max(
                      8,
                      Math.round((p.messageCount / c.maxMessages) * 100),
                    );
                    const rankBadge =
                      rank === 1
                        ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30"
                        : rank === 2
                          ? "bg-slate-400/20 text-slate-100 ring-1 ring-slate-300/30"
                          : rank === 3
                            ? "bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/25"
                            : "bg-background/20 text-muted-foreground/80 ring-1 ring-border/20";

                    return (
                      <div
                        key={p.alias}
                        className="relative overflow-hidden rounded-2xl bg-background/20 ring-1 ring-border/15 px-3 py-2.5"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/8"
                          style={{ width: `${widthPct}%` }}
                          aria-hidden="true"
                        />
                        <div className="relative flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-3">
                            <div
                              className={[
                                "shrink-0 rounded-full px-2 py-1 text-[11px] tabular-nums",
                                rankBadge,
                              ].join(" ")}
                            >
                              #{rank}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-semibold truncate">
                                {p.displayName}
                                <span className="text-muted-foreground/70 font-normal text-xs">
                                  {" "}
                                  ({p.alias})
                                </span>
                              </p>
                              <div className="mt-1 h-1.5 w-[180px] max-w-full rounded-full bg-background/25 overflow-hidden">
                                <div
                                  className="h-full bg-primary/45"
                                  style={{ width: `${widthPct}%` }}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[11px] text-muted-foreground/70">
                              메시지
                            </p>
                            <p className="text-base sm:text-lg font-semibold tabular-nums tracking-tight">
                              {p.messageCount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* 빈 칸 채우기(마지막 페이지 레이아웃 고정) - 인원이 8명 이상일 때만 */}
                  {c.participants.length >= 8 &&
                    Array.from(
                      { length: Math.max(0, 8 - c.participants.length) },
                      (_, n) => `empty-${c.pageIndex}-${n}`,
                    ).map((id) => (
                      <div
                        key={id}
                        className="rounded-2xl bg-background/10 ring-1 ring-border/10"
                        aria-hidden="true"
                      />
                    ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-center gap-1.5 text-muted-foreground/60">
                {Array.from({ length: c.pageCount }, (_, dot) => dot + 1).map(
                  (dot) => (
                    <div
                      key={dot}
                      className={[
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        dot - 1 === c.pageIndex
                          ? "bg-primary"
                          : "bg-muted-foreground/30",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "stats-tokens" && slide.content) {
      const c = slide.content;
      return (
        <div className="h-screen shrink-0 w-full overflow-hidden flex flex-col relative">
          <div className="px-4 sm:px-6 pt-4 pb-3 shrink-0 relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl bg-card/70 backdrop-blur-md px-4 py-3">
                <p className="text-xs sm:text-sm text-muted-foreground/75">
                  자주 쓰는 표현 · 참여자 {c.totalParticipants.toLocaleString()}
                  명
                </p>
                <p className="mt-1 text-sm sm:text-base text-muted-foreground/70">
                  반응/감정 표현 TOP
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 sm:px-6 pb-4 overflow-hidden relative z-10">
            <div className="max-w-2xl mx-auto h-full">
              <div className="h-full rounded-2xl bg-card/70 backdrop-blur-md p-4 sm:p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground/75">
                      톡방의 리액션 스타일
                    </p>
                    <p className="mt-1 text-base sm:text-lg font-semibold tracking-tight">
                      누가 어떤 감정을 가장 많이 썼을까?
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-background/25 px-2 py-1">
                    <span className="text-[11px] text-muted-foreground/80">
                      TOP 3
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-rows-3 gap-3 grow">
                  <div className="rounded-2xl bg-background/20 ring-1 ring-border/15 p-4 overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                          ㅋㅋ/ㅎㅎ
                        </p>
                        <p className="mt-1 text-base sm:text-lg font-semibold truncate">
                          {c.topLaughter?.displayName ?? "-"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-muted-foreground/70">
                          횟수
                        </p>
                        <p className="mt-0.5 text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                          {c.topLaughter
                            ? c.topLaughter.topTokens.laughter.toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-background/20 overflow-hidden">
                      <div
                        className="h-full bg-emerald-300/50 w-3/4"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-background/20 ring-1 ring-border/15 p-4 overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                          ㅠㅠ/ㅜㅜ
                        </p>
                        <p className="mt-1 text-base sm:text-lg font-semibold truncate">
                          {c.topCry?.displayName ?? "-"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-muted-foreground/70">
                          횟수
                        </p>
                        <p className="mt-0.5 text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                          {c.topCry
                            ? c.topCry.topTokens.cry.toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-background/20 overflow-hidden">
                      <div
                        className="h-full bg-sky-300/45 w-2/3"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-background/20 ring-1 ring-border/15 p-4 overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                          !/?/…
                        </p>
                        <p className="mt-1 text-base sm:text-lg font-semibold truncate">
                          {c.topPunctuation?.displayName ?? "-"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-muted-foreground/70">
                          횟수
                        </p>
                        <p className="mt-0.5 text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                          {c.topPunctuation
                            ? c.topPunctuation.topTokens.punctuation.toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-background/20 overflow-hidden">
                      <div
                        className="h-full bg-violet-300/45 w-1/2"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground/70">
                    위로 스와이프하면 다음 섹션으로 넘어가요
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "awards-intro") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-400/10 via-orange-300/5 to-transparent"
              aria-hidden="true"
            />
            <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-300/25">
              <Award className="h-5 w-5 text-amber-200" aria-hidden="true" />
            </div>

            <div className="relative space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                특별한 순간들을 기념해볼까요
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                상장
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                각 참여자에게 한 장씩, 올해의 기록을 드려요
              </p>
            </div>

            <div className="relative pt-2 grid grid-cols-3 gap-2 text-left">
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  장수
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold tabular-nums">
                  {fixedAwards.length.toLocaleString()}장
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  구성
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold">
                  6종 고정
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  조작
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold">
                  좌우 스와이프
                </p>
              </div>
            </div>

            <div className="relative pt-2">
              <SwipeHint label="위로 스와이프하여 상장 보기" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "awards" && slide.content) {
      return (
        <div className="h-screen shrink-0 w-full overflow-hidden relative">
          <AwardsCarousel
            awards={slide.content}
            stats={stats}
            mainEmblaApi={emblaApi}
          />
        </div>
      );
    }

    if (slide.type === "fortune-intro") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                마지막으로, 내년의 한 장면을 상상해볼까요
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                운세
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                참여자별로 짧게 정리해드려요
              </p>
            </div>

            <div className="pt-2 grid grid-cols-3 gap-2 text-left">
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  카드 수
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold tabular-nums">
                  {stats.participants.length.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  스타일
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold">
                  한 줄 운세
                </p>
              </div>
              <div className="rounded-2xl bg-background/35 px-4 py-3">
                <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                  팁
                </p>
                <p className="mt-1 text-base sm:text-lg font-semibold">
                  좌우 스와이프
                </p>
              </div>
            </div>

            <div className="pt-2">
              <SwipeHint label="위로 스와이프하여 운세 보기" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "fortune" && slide.content) {
      return (
        <FortuneCarousel
          fortune={slide.content}
          stats={stats}
          getFortuneTheme={getFortuneTheme}
        />
      );
    }

    if (slide.type === "mbti-intro") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10 overflow-hidden">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                이 톡방의 성격을 알아볼까요
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                톡방 MBTI
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                채팅 패턴으로 분석한 톡방의 성격 유형
              </p>
            </div>

            <div className="pt-2">
              <SwipeHint label="위로 스와이프하여 MBTI 보기" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "mbti" && slide.content) {
      const mbti = slide.content;
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
              <span className="text-3xl font-bold text-primary">
                {mbti.type}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                {mbti.description}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium">
                주요 특징
              </p>
              <div className="grid grid-cols-1 gap-2">
                {mbti.traits.map((trait) => (
                  <div
                    key={trait}
                    className="rounded-xl bg-background/35 px-4 py-3 text-left"
                  >
                    <p className="text-sm sm:text-base">{trait}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "group-fortune-intro") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10 overflow-hidden">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                톡방 전체의 내년을 예언해볼까요
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                단체 운세
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                올해의 기록으로 본 내년의 힌트
              </p>
            </div>

            <div className="pt-2">
              <SwipeHint label="위로 스와이프하여 운세 보기" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "group-fortune" && slide.content) {
      const fortune = slide.content;
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10">
            <div className="space-y-4">
              <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                {fortune.group}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground/70 font-medium">
                키워드
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {fortune.keywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="rounded-full bg-primary/10 px-4 py-2 text-sm ring-1 ring-primary/20"
                  >
                    {keyword}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "hot-topics-intro") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10 overflow-hidden">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                올해 가장 많이 이야기한 주제는
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                핫토픽
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                채팅에서 자주 언급된 화제들
              </p>
            </div>

            <div className="pt-2">
              <SwipeHint label="위로 스와이프하여 핫토픽 보기" />
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "hot-topics" && slide.content) {
      const hotTopics = slide.content.slice(0, 3);
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="w-full max-w-2xl space-y-4 bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                핫토픽
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                올해 가장 많이 이야기한 주제들
              </p>
            </div>

            <div className="space-y-3">
              {hotTopics.map((topic, idx) => (
                <Card
                  key={topic.topic}
                  className="relative overflow-hidden rounded-2xl border ring-1 bg-zinc-950/70 backdrop-blur-md"
                >
                  <CardHeader className="pb-2 px-4 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base sm:text-lg tracking-tight">
                        {topic.topic}
                      </CardTitle>
                      <div className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] tabular-nums">
                        #{idx + 1}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-sm sm:text-base leading-relaxed text-foreground/95">
                      {topic.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (slide.type === "share") {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-4 sm:px-6 shrink-0 w-full relative">
          <div className="text-center space-y-6 sm:space-y-8 max-w-2xl bg-card/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 relative z-10 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-400/10 via-sky-300/6 to-transparent"
              aria-hidden="true"
            />

            <div className="relative space-y-2">
              <p className="text-sm sm:text-base text-muted-foreground/80">
                여기까지가 올해의 기록이에요
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                공유해볼까요?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70">
                링크로 친구들에게 바로 보여줄 수 있어요
              </p>
            </div>

            <div className="relative rounded-2xl bg-background/25 ring-1 ring-border/15 px-4 py-3 text-left">
              <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                공유 링크
              </p>
              <p className="mt-1 text-sm sm:text-base font-medium break-all">
                {shareUrl || `/r/${slug ?? ""}`}
              </p>
              {shareHint ? (
                <p className="mt-1 text-xs text-emerald-200/90">{shareHint}</p>
              ) : null}
            </div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                className="h-12 rounded-xl"
                onClick={handleShare}
                type="button"
              >
                공유하기
              </Button>
              <Button
                className="h-12 rounded-xl"
                variant="secondary"
                onClick={handleCopyShareLink}
                type="button"
              >
                링크 복사
              </Button>
            </div>

            <div className="relative">
              <Button
                asChild
                className="h-12 w-full rounded-xl"
                variant="outline"
              >
                <Link href="/">직접해보기</Link>
              </Button>
              <p className="mt-2 text-xs text-muted-foreground/65">
                다른 채팅으로 다시 분석할 수 있어요
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-screen bg-background text-foreground dark overflow-hidden relative">
      <GradientBackground className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-3">
          <div className="flex items-center gap-3">
            <Progress
              value={slideProgressValue}
              className={[
                "h-2 backdrop-blur-md",
                "bg-background/30",
                progressTheme.track,
              ].join(" ")}
              indicatorClassName={[progressTheme.fill].join(" ")}
            />
            <div
              className={[
                "shrink-0 rounded-full backdrop-blur-md px-2 py-1",
                "bg-background/30",
                progressTheme.pill,
              ].join(" ")}
            >
              <span className="text-[11px] tabular-nums">
                {Math.min(currentSlide + 1, totalSlides)}/{totalSlides}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 위/아래 섹션 이동 버튼(스와이프 보조) */}
      <div className="absolute right-3 top-14 z-30 flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-10 rounded-full p-0"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!emblaApi || currentSlide <= 0}
          aria-label="이전 섹션"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-10 rounded-full p-0"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!emblaApi || currentSlide >= totalSlides - 1}
          aria-label="다음 섹션"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="overflow-hidden h-full relative z-10" ref={emblaRef}>
        <div className="flex flex-col h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="shrink-0 w-full h-screen">
              {renderSlide(slide)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
