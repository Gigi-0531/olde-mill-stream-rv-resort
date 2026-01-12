import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { InstallPrompt } from "@/components/InstallPrompt";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import MapPage from "@/pages/Map";
import Gallery from "@/pages/Gallery";
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
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!res.ok) {
        return null;
      }

      return res.json();
    },
  });
}

export function logout() {
  queryClient.clear();
  window.location.href = "/";
}

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Redirect to="/" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <NotFound />;
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
