import { NextResponse } from "next/server";

import { createUser } from "@/lib/auth-store/memory";

export async function POST(request: Request) {
  let body: { nickname?: string; email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  const nickname = body.nickname?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!nickname || !email || !password) {
    return NextResponse.json(
      { message: "필수 항목을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const user = createUser({ nickname, email, password });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_EXISTS") {
      return NextResponse.json(
        { message: "이미 가입된 이메일입니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "회원가입에 실패했습니다." },
      { status: 500 },
    );
  }
}
