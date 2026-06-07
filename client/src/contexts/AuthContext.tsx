import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type LoginRequest } from "@shared/routes";
import { useLocation } from "wouter";
import Median from "@/lib/median";

function medianOnesignalLogin(externalId: string) {
  if (typeof (window as any).median === "undefined") return;
  Median.onesignal.login(externalId).catch(() => {});
}

function medianOnesignalLogout() {
  if (typeof (window as any).median === "undefined") return;
  Median.onesignal.logout().catch(() => {});
}

type ProfileOption = {
  id: number;
  firstName: string;
  profilePicture?: string;
};

type User = {
  id: number;
  role: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  lotNumber?: string | null;
  phoneNumber?: string | null;
  profilePicture?: string | null;
};

type LoginResponse = {
  requiresProfileSelection?: boolean;
  requiresPin?: boolean;
  profiles?: ProfileOption[];
  id?: number;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => void;
  isLoggingIn: boolean;
  logout: () => void;
  loginError: Error | null;
  pendingProfiles: ProfileOption[] | null;
  selectProfile: (profileId: number) => void;
  isSelectingProfile: boolean;
  clearPendingProfiles: () => void;
  requiresPin: boolean;
  verifyPin: (pin: string) => void;
  isVerifyingPin: boolean;
  pinError: Error | null;
  clearPinState: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('oms_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem('oms_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('oms_user');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [pendingProfiles, setPendingProfiles] = useState<ProfileOption[] | null>(null);
  const [requiresPin, setRequiresPin] = useState(false);
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setStoredUser(user);
  }, [user]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.id) {
          setUser(data as User);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

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
        setRequiresPin(false);
      } else if (data.requiresPin) {
        setRequiresPin(true);
      } else {
        setUser(data as User);
        const externalId = (data as any).username;
        if (externalId) medianOnesignalLogin(externalId);
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
      return await res.json() as LoginResponse;
    },
    onSuccess: (data) => {
      setPendingProfiles(null);
      if (data.requiresPin) {
        setRequiresPin(true);
      } else {
        setUser(data as User);
        setLocation('/dashboard');
      }
    },
  });

  const verifyPinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        credentials: 'include',
      });

      const body = await res.json();
      if (!res.ok) {
        const err = new Error(body.message || "Incorrect PIN") as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      return body as User;
    },
    onSuccess: (userData) => {
      setPendingProfiles(null);
      setRequiresPin(false);
      setUser(userData as User);
      const externalId = (userData as any).username;
      if (externalId) medianOnesignalLogin(externalId);
      setLocation('/dashboard');
    },
    onError: (err: Error & { status?: number }) => {
      if (err.status === 429) {
        setRequiresPin(false);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: 'include',
      });
    },
    onSuccess: () => {
      medianOnesignalLogout();
      setUser(null);
      setRequiresPin(false);
      setPendingProfiles(null);
      setLocation('/');
    },
  });

  const value: AuthContextType = {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    pendingProfiles,
    selectProfile: selectProfileMutation.mutate,
    isSelectingProfile: selectProfileMutation.isPending,
    clearPendingProfiles: () => { setPendingProfiles(null); setRequiresPin(false); },
    requiresPin,
    verifyPin: verifyPinMutation.mutate,
    isVerifyingPin: verifyPinMutation.isPending,
    pinError: verifyPinMutation.error,
    clearPinState: () => { setRequiresPin(false); verifyPinMutation.reset(); },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
