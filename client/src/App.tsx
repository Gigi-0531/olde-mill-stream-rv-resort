import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { InstallPrompt } from "@/components/InstallPrompt";

import Landing from "@/pages/Landing";
import ProfileSelect from "@/pages/ProfileSelect";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import MapPage from "@/pages/Map";
import Gallery from "@/pages/Gallery";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

type UserRole = "resident" | "admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function useAuth() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data;
      } catch {
        return null;
      }
    },
  });
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    localStorage.removeItem("selectedProfile");
  } finally {
    window.location.assign("/");
  }
}

function ProtectedRoute({
  component: Component,
  adminOnly = false,
  skipProfileCheck = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
  skipProfileCheck?: boolean;
}) {
  const { data: user, isLoading, error } = useAuth();

  if (isLoading) return null;

  if (error || !user) {
    return <Redirect to="/" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <NotFound />;
  }

  // Check if resident has selected a profile (skip for profile-select page itself)
  if (!skipProfileCheck && user.role === "resident") {
    const selectedProfile = localStorage.getItem("selectedProfile");
    if (!selectedProfile) {
      return <Redirect to="/profile-select" />;
    }
  }

  return <Component />;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <Switch>
          <Route path="/" component={Landing} />

          <Route path="/profile-select">
            <ProtectedRoute component={ProfileSelect} skipProfileCheck />
          </Route>

          <Route path="/dashboard">
            <ProtectedRoute component={Dashboard} />
          </Route>

          <Route path="/activities">
            <ProtectedRoute component={Activities} />
          </Route>

          <Route path="/map">
            <ProtectedRoute component={MapPage} />
          </Route>

          <Route path="/gallery">
            <ProtectedRoute component={Gallery} />
          </Route>

          <Route path="/messages">
            <ProtectedRoute component={Messages} />
          </Route>

          <Route path="/settings">
            <ProtectedRoute component={Settings} />
          </Route>

          <Route path="/help">
            <ProtectedRoute component={Help} />
          </Route>

          <Route path="/admin">
            <ProtectedRoute component={Admin} adminOnly />
          </Route>

          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
