import { SiteHeader } from "@/components/layout/SiteHeader";
import styles from "./DebateRoom.module.css";

export function DebateMessagesSkeleton({ label = "발언 내역 불러오는 중" }: { label?: string }) {
  return (
    <div className="space-y-5 motion-safe:animate-pulse" aria-label={label} aria-busy="true" role="status">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100" />
        <div className="w-3/5 space-y-2">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-20 rounded-2xl rounded-bl-md bg-slate-100" />
        </div>
      </div>
      <div className="ml-auto h-20 w-3/5 rounded-2xl rounded-br-md bg-slate-200" />
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100" />
        <div className="h-24 w-4/5 rounded-2xl rounded-bl-md bg-slate-100" />
      </div>
    </div>
  );
}

export function DebateRoomSkeleton() {
  return (
    <div className={styles.shell}>
      <SiteHeader />
      <main className={styles.main} aria-label="토론방 정보를 불러오는 중" aria-busy="true">
        <div className={styles.heading}>
          <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 motion-safe:animate-pulse" />
          <div className="h-6 w-3/5 rounded-lg bg-slate-200 motion-safe:animate-pulse" />
        </div>
        <div className={styles.mobileStatus}><div className="h-8 w-32 rounded bg-slate-100 motion-safe:animate-pulse" /></div>
        <div className={styles.grid}>
          <aside className={styles.participantPanel}>
            <h2>참여자</h2>
            <div className="grid grid-cols-2 gap-3 p-3 min-[1200px]:grid-cols-1">
              {[0, 1].map((key) => <div key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 motion-safe:animate-pulse"><div className="size-8 shrink-0 rounded-full bg-slate-200" /><div className="h-4 w-16 rounded bg-slate-200" /></div>)}
            </div>
          </aside>
          <section className={styles.chat}>
            <div className={styles.chatHeading}><h2>토론 발언</h2></div>
            <div className={styles.messages}><DebateMessagesSkeleton /></div>
            <div className={styles.composer}><div className="h-14 rounded-2xl bg-slate-100 motion-safe:animate-pulse" /></div>
          </section>
          <aside className={styles.progressAside}><section><h2>진행 단계</h2><div className="mt-4 h-80 rounded-xl bg-slate-100 motion-safe:animate-pulse" /></section></aside>
        </div>
      </main>
    </div>
  );
}
