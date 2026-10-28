"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import type { DebateRole, DebateStage, DebateVerdict, Position } from "../api/debates";
import type { PresenceStatus } from "../presenceEvents";
import { debateStageLabels, formatTurnTime } from "../debateProgress";
import { verdictLabels } from "../debatePresentation";
import { ProfileAvatar } from "@/features/mypage/components/ProfileAvatar";
import styles from "./DebateRoom.module.css";

export function DebateTimer({ seconds, total, active }: { seconds: number | null; total: number; active: boolean }) {
  const remaining = seconds === null ? null : Math.min(Math.max(seconds, 0), total);
  const urgency = !active || remaining === null ? "idle" : remaining <= 10 ? "critical" : remaining <= 30 ? "warning" : "normal";
  return <div className={styles.timer} data-urgency={urgency}>
    <div><span>{active ? remaining === 0 ? "시간 종료" : "남은 시간" : "진행 대기"}</span><strong role="timer" aria-label={active ? `남은 시간 ${formatTurnTime(remaining)}` : "진행 대기"}>{active ? formatTurnTime(remaining) : "—"}</strong></div>
    <div className={styles.timeTrack} aria-hidden="true"><span style={{ width: active && remaining !== null && total > 0 ? `${remaining / total * 100}%` : "0%" }} /></div>
  </div>;
}

export type RoomParticipant = { role: DebateRole; position: Position; name: string; image: string | null; status: PresenceStatus; mine: boolean };
const presenceLabels: Record<PresenceStatus, string> = { unknown: "입장 확인 중", entered: "입장 완료", reconnecting: "재연결 중", left: "퇴장" };

export function DebateParticipants({ participants, speaker, free, loading = false }: { participants: RoomParticipant[]; speaker: Position | null; free: boolean; loading?: boolean }) {
  return <ul className={styles.participants} aria-label="참여자와 발언 차례">
    {participants.map((participant) => <li key={participant.role} data-position={participant.position} data-speaking={speaker === participant.position || free} data-mine={participant.mine}>
      <ProfileAvatar nickname={participant.name} profileImageUrl={participant.image} className={styles.avatar} />
      <div className={styles.participantCopy}>
        <div><span className={styles.position}>{participant.position === "PROS" ? "찬성" : "반대"}</span>{participant.mine ? <span>나</span> : null}{participant.role === "HOST" ? <span>방장</span> : null}</div>
        {loading ? <span className={styles.nameSkeleton} aria-label="참여자 정보를 불러오는 중" /> : <strong title={participant.name}>{participant.name}</strong>}
        <small data-status={participant.status}>{participant.status !== "entered" ? presenceLabels[participant.status] : free ? "자유 발언" : speaker === participant.position ? "발언 중" : "듣는 중"}</small>
      </div>
    </li>)}
  </ul>;
}

export function DebateVerdictSummary({ verdict, pending }: { verdict: DebateVerdict | undefined; pending: DebateStage | null }) {
  const failed = verdict?.status === "FAILED";
  const label = pending ? "AI가 발언을 분석하고 있어요" : failed ? "이번 중간 판결은 제공되지 않았어요" : verdict?.winnerPosition ? verdictLabels[verdict.winnerPosition] : "양측 입론 후 AI 판결이 시작돼요";
  return <div className={styles.summary} data-position={!pending && !failed ? verdict?.winnerPosition : undefined}>
    <Image src={pending || !verdict ? "/images/mascot/owl-thinking.png" : "/images/mascot/owl-judge-gavel.png"} alt="" width={32} height={32} />
    <div><span>{pending ? `${debateStageLabels[pending]} · 분석 중` : verdict ? `${debateStageLabels[verdict.stage]} · 중간 결과` : "AI 중간 판결"}</span><strong>{label}</strong></div>
    {verdict && !pending ? <a href={`#debate-verdict-${verdict.stage}`} className={styles.reasonLink}>근거 보기<span className="sr-only"> · {debateStageLabels[verdict.stage]}</span></a> : null}
  </div>;
}

// Native dialog supplies focus containment, Escape handling and focus restoration.
export function DebateDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className={styles.dialog} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialogHeading}><h2>{title}</h2><button type="button" aria-label="닫기" onClick={onClose}>×</button></div>
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}
