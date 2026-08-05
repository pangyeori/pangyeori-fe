import { NextResponse } from "next/server";

import { issueTemporaryPassword } from "@/lib/auth-store/memory";

export async function POST(request: Request) {
  let body: { email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  const email = body.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json(
      { message: "이메일을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const result = issueTemporaryPassword(email);
    return NextResponse.json({
      ok: true,
      message: "임시 비밀번호가 발급되었습니다.",
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { message: "가입되지 않은 이메일입니다." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { message: "임시 비밀번호 발급에 실패했습니다." },
      { status: 500 },
    );
  }
}
