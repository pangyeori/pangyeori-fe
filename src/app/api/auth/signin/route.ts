import { NextResponse } from "next/server";

import {
  findUserByEmail,
  issueToken,
} from "@/lib/auth-store/memory";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; rememberMe?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { message: "이메일과 비밀번호를 입력해주세요." },
      { status: 400 },
    );
  }

  const stored = findUserByEmail(email);
  if (!stored || stored.password !== password) {
    return NextResponse.json(
      { message: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const accessToken = issueToken(stored.id);

  return NextResponse.json({
    accessToken,
    user: {
      id: stored.id,
      email: stored.email,
      nickname: stored.nickname,
    },
  });
}
