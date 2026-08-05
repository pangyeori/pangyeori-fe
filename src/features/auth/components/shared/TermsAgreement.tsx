"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";

export type TermsValues = {
  service: boolean;
  privacy: boolean;
  marketing: boolean;
};

type TermsAgreementProps = {
  value: TermsValues;
  onChange: (next: TermsValues) => void;
  error?: string;
};

const TERMS_COPY: Record<"service" | "privacy" | "marketing", { title: string; body: string }> = {
  service: {
    title: "서비스 이용약관",
    body: "판겨리 서비스 이용과 관련된 권리·의무, 토론 이용 규칙, AI 판정 결과의 참고 목적 안내 등을 포함합니다. 실제 약관 전문은 추후 확정됩니다.",
  },
  privacy: {
    title: "개인정보 수집 및 이용",
    body: "회원가입을 위해 닉네임, 이메일, 비밀번호를 수집하며 회원 관리 및 서비스 제공 목적으로 이용합니다. 실제 처리방침 전문은 추후 확정됩니다.",
  },
  marketing: {
    title: "마케팅 정보 수신 동의",
    body: "이벤트, 신규 기능, 프로모션 정보를 이메일 등으로 안내할 수 있습니다. 선택 동의사항이며 언제든 철회할 수 있습니다.",
  },
};

export function TermsAgreement({ value, onChange, error }: TermsAgreementProps) {
  const [openKey, setOpenKey] = useState<"service" | "privacy" | "marketing" | null>(
    null,
  );

  const allRequired = value.service && value.privacy;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-3.5 py-3">
      <label className="flex items-start gap-2.5 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--ink)]"
          checked={allRequired && value.marketing}
          onChange={(event) => {
            const checked = event.target.checked;
            onChange({
              service: checked,
              privacy: checked,
              marketing: checked,
            });
          }}
        />
        <span className="font-medium">전체 동의</span>
      </label>

      <div className="h-px bg-[var(--line)]" />

      {(
        [
          { key: "service", label: "[필수] 서비스 이용약관", required: true },
          {
            key: "privacy",
            label: "[필수] 개인정보 수집 및 이용",
            required: true,
          },
          {
            key: "marketing",
            label: "[선택] 마케팅 정보 수신",
            required: false,
          },
        ] as const
      ).map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-3">
          <label className="flex items-start gap-2.5 text-sm text-[var(--ink-muted)]">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--ink)]"
              checked={value[item.key]}
              onChange={(event) =>
                onChange({ ...value, [item.key]: event.target.checked })
              }
            />
            <span>{item.label}</span>
          </label>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-[var(--ink-faint)] underline-offset-2 hover:text-[var(--ink-muted)] hover:underline"
            onClick={() => setOpenKey(item.key)}
          >
            보기
          </button>
        </div>
      ))}

      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <Modal
        open={openKey !== null}
        title={openKey ? TERMS_COPY[openKey].title : ""}
        onClose={() => setOpenKey(null)}
      >
        <p>{openKey ? TERMS_COPY[openKey].body : null}</p>
      </Modal>
    </div>
  );
}
