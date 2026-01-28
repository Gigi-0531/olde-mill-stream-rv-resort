import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest } from "@shared/routes";
import { useLocation } from "wouter";
import { useState } from "react";

type ProfileOption = {
  id: number;
  firstName: string;
  profilePicture?: string;
};

type LoginResponse = {
  requiresProfileSelection?: boolean;
  profiles?: ProfileOption[];
  id?: number;
  role?: string;
};

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [pendingProfiles, setPendingProfiles] = useState<ProfileOption[] | null>(null);

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
      return await res.json() as LoginResponse;
    },
    onSuccess: (data) => {
      if (data.requiresProfileSelection && data.profiles) {
        setPendingProfiles(data.profiles);
      } else {
        queryClient.setQueryData([api.auth.me.path], data);
        if (data.role === 'admin') {
          setLocation('/admin');
        } else {
          setLocation('/dashboard');
        }
      }
    },
  });

  const selectProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      const res = await fetch("/api/auth/select-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error((await res.json()).message || "Profile selection failed");
      }
      return await res.json();
    },
    onSuccess: (user) => {
      setPendingProfiles(null);
      queryClient.setQueryData([api.auth.me.path], user);
      setLocation('/dashboard');
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

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    pendingProfiles,
    selectProfile: selectProfileMutation.mutate,
    isSelectingProfile: selectProfileMutation.isPending,
    clearPendingProfiles: () => setPendingProfiles(null),
  };
}
