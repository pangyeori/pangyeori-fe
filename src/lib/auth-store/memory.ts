type AuthUser = {
  id: string;
  email: string;
  nickname: string;
};

export type StoredUser = AuthUser & {
  password: string;
};

type GlobalAuthStore = {
  users: Map<string, StoredUser>;
};

function store(): GlobalAuthStore {
  const g = globalThis as typeof globalThis & {
    __pangyeoriAuth?: GlobalAuthStore;
  };
  if (!g.__pangyeoriAuth) {
    g.__pangyeoriAuth = {
      users: new Map(),
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
