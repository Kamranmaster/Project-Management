import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { authApi, type LoginInput, type RegisterInput } from "@/api/authApi";
import { parseApiError } from "@/lib/errors";
import { queryKeys } from "@/lib/queryClient";
import type { User } from "@/types";

/** Drop every cached query except the auth state, then set the user. */
export function resetSession(queryClient: QueryClient, user: User | null) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
  queryClient.setQueryData(queryKeys.me, user);
}

/**
 * Source of truth for the logged-in user. Resolves to `null` when there is no
 * valid session (after the interceptor has already tried a silent refresh).
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await authApi.currentUser();
      } catch (error) {
        if (parseApiError(error).status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** For components rendered inside ProtectedRoute, where the user is guaranteed. */
export function useAuthenticatedUser(): User {
  const { data } = useCurrentUser();
  if (!data) throw new Error("useAuthenticatedUser must be used inside a protected route");
  return data;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (user) => resetSession(queryClient, user),
  });
}

export function useRegister() {
  return useMutation({ mutationFn: (input: RegisterInput) => authApi.register(input) });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    // Even if the request fails (e.g. session already expired), the local session ends.
    onSettled: () => resetSession(queryClient, null),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email) });
}

export function useResetPassword(resetToken: string) {
  return useMutation({
    mutationFn: (newPassword: string) => authApi.resetPassword(resetToken, newPassword),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(input.oldPassword, input.newPassword),
  });
}

export function useResendVerification() {
  return useMutation({ mutationFn: () => authApi.resendEmailVerification() });
}

/**
 * Verification tokens are single-use, so this is a query (deduplicated, never
 * retried) rather than a mutation that StrictMode could fire twice.
 */
export function useVerifyEmail(token: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["auth", "verify-email", token],
    queryFn: async () => {
      await authApi.verifyEmail(token);
      // A logged-in user should see the verified state immediately.
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      return true;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
