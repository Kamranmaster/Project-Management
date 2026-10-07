import { http } from "@/lib/http";
import type { ApiResponse, User } from "@/types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  fullname?: string;
}

export const authApi = {
  async login(input: LoginInput) {
    // The response also contains the tokens; they are deliberately ignored —
    // the session lives in the httpOnly cookies the backend sets.
    const { data } = await http.post<ApiResponse<{ user: User }>>("/auth/login", input);
    return data.data.user;
  },

  async register(input: RegisterInput) {
    const { data } = await http.post<ApiResponse<{ user: User }>>("/auth/register", input);
    return data.data.user;
  },

  /** The backend exposes this as POST, not GET. */
  async currentUser() {
    const { data } = await http.post<ApiResponse<User>>("/auth/current-user");
    return data.data;
  },

  async logout() {
    await http.post("/auth/logout");
  },

  async forgotPassword(email: string) {
    await http.post("/auth/forgot-password", { email });
  },

  async resetPassword(resetToken: string, newPassword: string) {
    await http.post(`/auth/reset-password/${encodeURIComponent(resetToken)}`, { newPassword });
  },

  async verifyEmail(verificationToken: string) {
    await http.get(`/auth/verify-email/${encodeURIComponent(verificationToken)}`);
  },

  async resendEmailVerification() {
    await http.post("/auth/resend-email-verification");
  },

  async changePassword(oldPassword: string, newPassword: string) {
    await http.post("/auth/change-password", { oldPassword, newPassword });
  },
};
