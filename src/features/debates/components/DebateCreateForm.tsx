"use client";
"use no memo";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/features/auth/components/shared/AuthFormChrome";
import { createDebate } from "@/features/debates/api/debates";
import {
  debateCreateSchema,
  type DebateCreateFormValues,
} from "@/features/debates/schemas/debateCreateSchema";
import { rememberDebateRoom } from "@/features/debates/roomSession";

const positionOptions = [
  {
    value: "PROS",
    label: "찬성",
    description: "주제에 동의하는 입장에서 토론해요.",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "CONS",
    label: "반대",
    description: "주제에 반대하는 입장에서 토론해요.",
    badgeClass: "bg-rose-100 text-rose-700",
  },
] as const;

const turnTimeOptions = [60, 180, 300, 600] as const;
const freeDebateTimeOptions = [300, 600, 1200, 1800] as const;

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}분${rest ? ` ${rest}초` : ""}`;
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepTitle({ number, children }: { number: number; children: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-white">
        {number}
      </span>
      <h2 className="text-lg font-bold text-[var(--ink)]">{children}</h2>
    </div>
  );
}

export function DebateCreateForm({ accessToken, onExit }: {
  accessToken: string;
  onExit: () => void;
}) {
  const router = useRouter();
  const form = useForm<DebateCreateFormValues>({
    resolver: zodResolver(debateCreateSchema),
    mode: "onSubmit",
    defaultValues: {
      title: "",
      description: "",
      hostPosition: "PROS",
      turnTimeSeconds: 180,
      freeDebateTimeSeconds: 600,
    },
  });
  const [title, description, hostPosition, turnTimeSeconds, freeDebateTimeSeconds] =
    useWatch({
      control: form.control,
      name: [
        "title",
        "description",
        "hostPosition",
        "turnTimeSeconds",
        "freeDebateTimeSeconds",
      ],
    });
  const selectedPosition = positionOptions.find(
    ({ value }) => value === hostPosition,
  )!;

  const createMutation = useMutation({
    mutationFn: (values: DebateCreateFormValues) =>
      createDebate(accessToken, {
        title: values.title,
        description: values.description || undefined,
        hostPosition: values.hostPosition,
        turnTimeSeconds: values.turnTimeSeconds,
        freeDebateTimeSeconds: values.freeDebateTimeSeconds,
      }),
    onSuccess: (debate) => {
      rememberDebateRoom({
        debateId: debate.id,
        title: debate.title,
        description: debate.description,
        hostPosition: debate.hostPosition,
        guestPosition: debate.guestPosition,
        turnTimeSeconds: debate.turnTimeSeconds,
        freeDebateTimeSeconds: debate.freeDebateTimeSeconds,
        createdAt: new Date().toISOString(),
        inviteToken: debate.inviteToken,
      });
      router.push(`/debates/${encodeURIComponent(debate.id)}/waiting`);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createMutation.reset();
    createMutation.mutate(values);
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)] sm:p-8">
            <StepTitle number={1}>토론 주제 정하기</StepTitle>
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="debate-title" className="text-sm font-semibold text-[var(--ink)]">
                  토론 주제 <span className="text-[var(--danger)]">*</span>
                </label>
                <span className={`text-xs ${title.length > 100 ? "text-[var(--danger)]" : "text-[var(--ink-faint)]"}`}>
                  {title.length}/100
                </span>
              </div>
              <input
                id="debate-title"
                type="text"
                placeholder="예: AI는 인간의 창작물을 대체할 수 있는가?"
                aria-invalid={Boolean(form.formState.errors.title)}
                aria-describedby={form.formState.errors.title ? "debate-title-error" : undefined}
                className={`mt-2 h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:ring-2 ${
                  form.formState.errors.title
                    ? "border-[var(--danger)] focus:ring-[var(--danger-soft)]"
                    : "border-[var(--line)] hover:border-[var(--line-strong)] focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue-soft)]"
                }`}
                {...form.register("title", {
                  onChange: () => createMutation.reset(),
                })}
              />
              {form.formState.errors.title ? (
                <p id="debate-title-error" role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
                  {form.formState.errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="debate-description" className="text-sm font-semibold text-[var(--ink)]">
                  토론 설명 <span className="font-normal text-[var(--ink-faint)]">(선택)</span>
                </label>
                <span className="text-xs text-[var(--ink-faint)]">{description.length}자</span>
              </div>
              <textarea
                id="debate-description"
                rows={4}
                placeholder="토론의 배경이나 쟁점을 간단히 설명해주세요."
                className="mt-2 w-full resize-y rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[15px] leading-6 text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] hover:border-[var(--line-strong)] focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue-soft)]"
                {...form.register("description", {
                  onChange: () => createMutation.reset(),
                })}
              />
              <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
                참여자가 주제를 이해하는 데 도움이 되는 내용을 적어주세요.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)] sm:p-8">
            <fieldset>
              <legend className="w-full">
                <StepTitle number={2}>내 입장 선택하기</StepTitle>
              </legend>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {positionOptions.map((option) => {
                  const selected = hostPosition === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border-2 p-5 transition ${
                        selected
                          ? "border-[var(--brand-blue)] bg-blue-50 shadow-[0_6px_20px_rgba(37,99,235,0.1)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--line-strong)]"
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="sr-only"
                        {...form.register("hostPosition", {
                          onChange: () => createMutation.reset(),
                        })}
                      />
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${option.badgeClass}`}>
                            {option.label}
                          </span>
                          <span className="mt-3 block text-sm leading-6 text-[var(--ink-muted)]">
                            {option.description}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]"
                              : "border-[var(--line-strong)]"
                          }`}
                        >
                          {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[var(--ink-faint)]">
                상대방은 자동으로 반대 입장에 배정됩니다.
              </p>
            </fieldset>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)] sm:p-8">
            <StepTitle number={3}>토론 시간 설정하기</StepTitle>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[var(--ink)]">
                차례당 발언 시간
                <select
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-[15px] text-[var(--ink)] outline-none transition hover:border-[var(--line-strong)] focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue-soft)]"
                  {...form.register("turnTimeSeconds", {
                    valueAsNumber: true,
                    onChange: () => createMutation.reset(),
                  })}
                >
                  {turnTimeOptions.map((seconds) => (
                    <option key={seconds} value={seconds}>{formatSeconds(seconds)}</option>
                  ))}
                </select>
                <span className="mt-1.5 block text-xs font-normal text-[var(--ink-faint)]">
                  한 번 발언할 때 주어지는 시간이에요.
                </span>
              </label>

              <label className="block text-sm font-semibold text-[var(--ink)]">
                자유 토론 시간
                <select
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-[15px] text-[var(--ink)] outline-none transition hover:border-[var(--line-strong)] focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue-soft)]"
                  {...form.register("freeDebateTimeSeconds", {
                    valueAsNumber: true,
                    onChange: () => createMutation.reset(),
                  })}
                >
                  {freeDebateTimeOptions.map((seconds) => (
                    <option key={seconds} value={seconds}>{formatSeconds(seconds)}</option>
                  ))}
                </select>
                <span className="mt-1.5 block text-xs font-normal text-[var(--ink-faint)]">
                  양측이 자유롭게 의견을 나누는 시간이에요.
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.07)]">
            <div className="border-b border-[var(--line)] px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
                Preview
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--ink)]">토론방 미리보기</h2>
            </div>
            <div className="p-6">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${selectedPosition.badgeClass}`}>
                나는 {selectedPosition.label}
              </span>
              <h3 className={`mt-4 text-xl font-bold leading-8 tracking-tight ${title.trim() ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"} [overflow-wrap:anywhere]`}>
                {title.trim() || "토론 주제가 여기에 표시됩니다."}
              </h3>
              <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${description.trim() ? "text-[var(--ink-muted)]" : "text-[var(--ink-faint)]"} [overflow-wrap:anywhere]`}>
                {description.trim() || "설명을 입력하면 참여자가 토론의 배경을 미리 확인할 수 있어요."}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5">
                <div className="rounded-xl bg-blue-50 p-4">
                  <dt className="text-xs font-medium text-blue-700">차례당 발언</dt>
                  <dd className="mt-1 font-bold text-[var(--ink)]">{formatSeconds(turnTimeSeconds)}</dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-4">
                  <dt className="text-xs font-medium text-violet-700">자유 토론</dt>
                  <dd className="mt-1 font-bold text-[var(--ink)]">{formatSeconds(freeDebateTimeSeconds)}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-xs leading-5 text-[var(--ink-muted)]">
                토론방을 만들면 초대 링크가 생성됩니다. 링크를 공유해 상대방을 초대할 수 있어요.
              </div>
            </div>
          </section>

          {createMutation.error ? (
            <div className="mt-4">
              <FormAlert>
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "토론방을 만들지 못했습니다. 잠시 후 다시 시도해주세요."}
              </FormAlert>
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 text-[15px] font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
            >
              나가기
            </button>
            <Button type="submit" className="flex-[1.5]" loading={createMutation.isPending}>
              토론방 만들기 <ArrowIcon />
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
