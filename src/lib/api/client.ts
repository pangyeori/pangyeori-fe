export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly body: unknown;

  constructor(
    message: string,
    status: number,
    body?: unknown,
    code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
};

type BackendApiError = {
  code?: string;
  message?: string;
  details?: { field?: string; message?: string }[] | null;
};

type BackendApiResponse = {
  success: boolean;
  data?: unknown;
  error?: BackendApiError | null;
};

function getBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base === undefined || base === "") {
    return "";
  }
  return base.replace(/\/$/, "");
}

function isBackendEnvelope(body: unknown): body is BackendApiResponse {
  return Boolean(
    body &&
      typeof body === "object" &&
      "success" in body &&
      typeof (body as BackendApiResponse).success === "boolean",
  );
}

function extractErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;

  if (record.error && typeof record.error === "object") {
    const error = record.error as BackendApiError;
    const detailMessage = error.details?.find(
      (item) => typeof item.message === "string" && item.message.trim(),
    )?.message;
    if (detailMessage) return detailMessage;
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }
  return fallback;
}

function extractErrorCode(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.error && typeof record.error === "object") {
    const code = (record.error as BackendApiError).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

function fallbackByStatus(status: number) {
  if (status === 401) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (status === 409) return "이미 처리된 요청입니다.";
  if (status === 400) return "입력값을 다시 확인해주세요.";
  if (status === 422) return "요청을 처리할 수 없습니다.";
  if (status === 503) return "서비스를 일시적으로 사용할 수 없습니다.";
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "서버에 연결할 수 없습니다. 네트워크 상태를 확인하세요.",
      0,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, fallbackByStatus(response.status)),
      response.status,
      payload,
      extractErrorCode(payload),
    );
  }

  // BE 공통 포맷: { success, data, error }
  if (isBackendEnvelope(payload)) {
    if (!payload.success) {
      throw new ApiError(
        extractErrorMessage(payload, fallbackByStatus(response.status)),
        response.status,
        payload,
        extractErrorCode(payload),
      );
    }
    return payload.data as T;
  }

  // FE mock 등 envelope 없는 응답
  return payload as T;
}
