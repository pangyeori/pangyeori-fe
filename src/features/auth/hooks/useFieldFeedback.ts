"use client";

import { useCallback, useState } from "react";
import type { FieldError, FieldErrors, FieldValues, Path } from "react-hook-form";

type FeedbackFormState<T extends FieldValues> = {
  errors: FieldErrors<T>;
  touchedFields: Partial<Record<string, unknown>>;
  isSubmitted: boolean;
};

/**
 * 작성 중(포커스)에는 에러/성공 톤을 숨기고,
 * blur 또는 submit 이후에만 검증 UI를 보여준다.
 */
export function useFieldFeedback<T extends FieldValues>(
  formState: FeedbackFormState<T>,
) {
  const [focusedField, setFocusedField] = useState<Path<T> | null>(null);
  const { errors, touchedFields, isSubmitted } = formState;

  const bindFocus = useCallback((name: Path<T>) => {
    return {
      onFocus: () => setFocusedField(name),
      onBlurCapture: () => setFocusedField(null),
    };
  }, []);

  const errorOf = useCallback(
    (name: Path<T>) => {
      if (focusedField === name) return undefined;
      if (!(touchedFields[name as string] || isSubmitted)) return undefined;
      const fieldError = errors[name] as FieldError | undefined;
      return typeof fieldError?.message === "string"
        ? fieldError.message
        : undefined;
    },
    [errors, focusedField, isSubmitted, touchedFields],
  );

  const validOf = useCallback(
    (name: Path<T>, value: unknown) => {
      if (focusedField === name) return false;
      if (!(touchedFields[name as string] || isSubmitted)) return false;
      if (errors[name]) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return Boolean(value);
    },
    [errors, focusedField, isSubmitted, touchedFields],
  );

  return { bindFocus, errorOf, validOf, focusedField };
}
