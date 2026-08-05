export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
};

export type SignUpRequest = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type SignUpResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterRequest = {
  nickname: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  user: AuthUser;
};
