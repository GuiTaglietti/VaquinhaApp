import api from "@/lib/api";

import {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  DeleteAccountRequest,
} from "@/types";

export const authService = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<void> {
    await api.post("/auth/register", data);
  },

  async refresh(): Promise<AuthTokens> {
    const response = await api.post("/auth/refresh");
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await api.post("/auth/forgot-password", data);
  },

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await api.post("/auth/reset-password", data);
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.post("/auth/change-password", data);
  },

  async deleteAccount(data: DeleteAccountRequest): Promise<void> {
    await api.delete("/auth/delete-account", { data });
  },
};
