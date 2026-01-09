import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { InstallPrompt } from "@/components/InstallPrompt";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Activities from "@/pages/Activities";
import MapPage from "@/pages/Map";
import Admin from "@/pages/Admin";
import Gallery from "@/pages/Gallery";

const isAuthenticated = () => {
  return true;
};

const isAdmin = () => {
  return true;
};

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  if (!isAuthenticated()) {
    return <Redirect to="/" />;
  }

  if (adminOnly && !isAdmin()) {
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

function App() {
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

export default App;
