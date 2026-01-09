import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

type UserRole = "user" | "admin";

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

function getAuth() {
  const token = localStorage.getItem("auth_token");
  const role = localStorage.getItem("user_role") as UserRole | null;

  return {
    isAuthenticated: Boolean(token),
    role,
  };
}

export function logout() {
  localStorage.clear();
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
  const { isAuthenticated, role } = getAuth();

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  if (adminOnly && role !== "admin") {
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
