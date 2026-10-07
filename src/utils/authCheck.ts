import apiPlain from "./apiPlain";

interface AuthStatusResponse {
  isLoggedIn: boolean;
  role?: string | null;
}

export const checkAuthStatus = async (): Promise<AuthStatusResponse> => {
  try {
    const res = await apiPlain.get<AuthStatusResponse>("/auth/status");
    return res.data;
  } catch {
    return { isLoggedIn: false };
  }
};
