"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { SiteHeader } from "@/components/layout/SiteChrome";
import { createDebate, type Position } from "@/features/debates/api/debates";
import { useAuth } from "@/features/auth/context/AuthProvider";

export default function NewDebatePage() {
  const router = useRouter();
  const { accessToken, isReady } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady && !accessToken) router.replace("/signin?next=/debates/new");
  }, [accessToken, isReady, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const debate = await createDebate(accessToken, {
        title: String(form.get("title") ?? "").trim(),
        description: String(form.get("description") ?? "").trim() || undefined,
        hostPosition: String(form.get("hostPosition")) as Position,
        turnTimeSeconds: Number(form.get("turnTimeSeconds")),
        freeDebateTimeSeconds: Number(form.get("freeDebateTimeSeconds")),
      });
      router.push(`/debates/${encodeURIComponent(debate.id)}/waiting?token=${encodeURIComponent(debate.inviteToken)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "토론방을 만들지 못했습니다.");
      setBusy(false);
    }
  };

  if (!isReady || !accessToken) return null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--page-bg)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold">토론방 만들기</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-1">토론 주제<input name="title" required defaultValue="AI는 인간의 창작물을 대체할 수 있는가?" className="rounded border p-2" /></label>
          <label className="grid gap-1">설명<textarea name="description" defaultValue="AI 창작물의 가치와 인간 고유의 창의성에 대해 토론합니다." className="rounded border p-2" /></label>
          <label className="grid gap-1">내 입장<select name="hostPosition" defaultValue="PROS" className="rounded border p-2"><option value="PROS">찬성</option><option value="CONS">반대</option></select></label>
          <label className="grid gap-1">발언 시간(초)<input name="turnTimeSeconds" type="number" min="30" max="600" required defaultValue="180" className="rounded border p-2" /></label>
          <label className="grid gap-1">자유 토론 시간(초)<input name="freeDebateTimeSeconds" type="number" min="60" max="1800" required defaultValue="600" className="rounded border p-2" /></label>
          {error ? <p role="alert" className="text-red-600">{error}</p> : null}
          <button disabled={busy} className="rounded bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">{busy ? "생성 중…" : "토론방 생성"}</button>
        </form>
      </main>
    </div>
  );
}
