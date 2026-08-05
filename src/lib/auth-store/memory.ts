import type { AuthUser } from "@/types/auth";

export type StoredUser = AuthUser & {
  password: string;
};

type GlobalAuthStore = {
  users: Map<string, StoredUser>;
  tokens: Map<string, string>;
};

function store(): GlobalAuthStore {
  const g = globalThis as typeof globalThis & {
    __pangyeoriAuth?: GlobalAuthStore;
  };
  if (!g.__pangyeoriAuth) {
    g.__pangyeoriAuth = {
      users: new Map(),
      tokens: new Map(),
    };
  }
  return g.__pangyeoriAuth;
}

export function findUserByEmail(email: string) {
  return store().users.get(email.toLowerCase()) ?? null;
}

export function createUser(input: {
  nickname: string;
  email: string;
  password: string;
}): AuthUser {
  const email = input.email.toLowerCase();
  const users = store().users;
  if (users.has(email)) {
    throw new Error("ALREADY_EXISTS");
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    nickname: input.nickname,
    password: input.password,
  };
  users.set(email, user);

  return { id: user.id, email: user.email, nickname: user.nickname };
}

export function issueToken(userId: string) {
  const token = `pg_${crypto.randomUUID().replace(/-/g, "")}`;
  store().tokens.set(token, userId);
  return token;
}

export function revokeToken(token: string) {
  store().tokens.delete(token);
}

export function getUserIdByToken(token: string) {
  return store().tokens.get(token) ?? null;
}

/** FE mock — 이메일 인증은 BE가 담당. 여기선 가입 여부만 확인 */
export function issueTemporaryPassword(email: string) {
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const temporaryPassword = `Tmp!${Math.random().toString(36).slice(2, 8)}`;
  user.password = temporaryPassword;
  return { temporaryPassword };
}
