export type SignInRequest = {
  email: string;
  password: string;
};

export type SignInResponse = {
  accessToken: string;
  tokenType: string;
};

export type RegisterRequest = {
  nickname: string;
  email: string;
  password: string;
};
