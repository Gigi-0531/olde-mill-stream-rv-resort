import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import MapPage from "@/pages/Map";
import Gallery from "@/pages/Gallery";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import Admin from "@/pages/Admin";
import Residents from "@/pages/Residents";
import NotFound from "@/pages/not-found";

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

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

          <Route path="/messages">
            <ProtectedRoute component={Messages} />
          </Route>

          <Route path="/residents">
            <ProtectedRoute component={Residents} adminOnly />
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <InstallPrompt />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
