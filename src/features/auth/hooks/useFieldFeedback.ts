"use client";

import { useCallback, useState } from "react";
import type { FieldError, FieldErrors, FieldValues, Path } from "react-hook-form";

type FeedbackFormState<T extends FieldValues> = {
  dirtyFields: Partial<Record<string, unknown>>;
  errors: FieldErrors<T>;
  touchedFields: Partial<Record<string, unknown>>;
  isSubmitted: boolean;
};

/**
 * blur 또는 submit 이후에 검증 UI를 보여준다.
 * 포커스 여부는 피드백 표시 조건에 관여하지 않는다.
 */
export function useFieldFeedback<T extends FieldValues>(
  formState: FeedbackFormState<T>,
  { showWhileDirty = false }: { showWhileDirty?: boolean } = {},
) {
  const [focusedField, setFocusedField] = useState<Path<T> | null>(null);
  const { dirtyFields, errors, touchedFields, isSubmitted } = formState;

  const bindFocus = useCallback((name: Path<T>) => {
    return {
      onFocus: () => setFocusedField(name),
      onBlurCapture: () => setFocusedField(null),
    };
  }, []);

  const errorOf = useCallback(
    (name: Path<T>) => {
      const shouldShow =
        touchedFields[name as string] ||
        isSubmitted ||
        (showWhileDirty && dirtyFields[name as string]);
      if (!shouldShow) return undefined;
      const fieldError = errors[name] as FieldError | undefined;
      return typeof fieldError?.message === "string"
        ? fieldError.message
        : undefined;
    },
    [dirtyFields, errors, isSubmitted, showWhileDirty, touchedFields],
  );

  const validOf = useCallback(
    (name: Path<T>, value: unknown) => {
      const shouldShow =
        touchedFields[name as string] ||
        isSubmitted ||
        (showWhileDirty && dirtyFields[name as string]);
      if (!shouldShow) return false;
      if (errors[name]) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return Boolean(value);
    },
    [dirtyFields, errors, isSubmitted, showWhileDirty, touchedFields],
  );

  return { bindFocus, errorOf, validOf, focusedField };
}
