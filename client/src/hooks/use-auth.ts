import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest } from "@shared/routes";
import { useLocation } from "wouter";
import { useState } from "react";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [requiresGoogleVerification, setRequiresGoogleVerification] = useState(false);

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error((await res.json()).message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (response) => {
      if (response.requiresGoogleVerification) {
        setRequiresGoogleVerification(true);
      } else {
        queryClient.setQueryData([api.auth.me.path], response);
        if (response.role === 'admin') {
          setLocation('/admin');
        } else {
          setLocation('/dashboard');
        }
      }
    },
  });

  const googleVerifyMutation = useMutation({
    mutationFn: async (credential: string) => {
      const res = await fetch("/api/auth/verify-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error((await res.json()).message || "Google verification failed");
      }
      return await res.json();
    },
    onSuccess: (user) => {
      setRequiresGoogleVerification(false);
      queryClient.setQueryData([api.auth.me.path], user);
      setLocation('/admin');
    },
    onError: () => {
      setRequiresGoogleVerification(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation('/');
    },
  });

  const cancelGoogleVerification = () => {
    setRequiresGoogleVerification(false);
  };

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    requiresGoogleVerification,
    verifyWithGoogle: googleVerifyMutation.mutate,
    isVerifyingGoogle: googleVerifyMutation.isPending,
    googleVerifyError: googleVerifyMutation.error,
    cancelGoogleVerification,
  };
}
