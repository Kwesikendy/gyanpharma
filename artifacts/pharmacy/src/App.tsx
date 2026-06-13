import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { Layout } from "@/components/layout/Layout";

import Login from "@/pages/login";
import Setup from "@/pages/setup";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import StockEntry from "@/pages/stock-entry";
import Dispensing from "@/pages/dispensing";
import Suppliers from "@/pages/suppliers";
import Reports from "@/pages/reports";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/setup" component={Setup} />

      <Route path="/dashboard">
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>
      </Route>
      <Route path="/stock-entry">
        <ProtectedRoute><Layout><StockEntry /></Layout></ProtectedRoute>
      </Route>
      <Route path="/dispensing">
        <ProtectedRoute><Layout><Dispensing /></Layout></ProtectedRoute>
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute><Layout><Suppliers /></Layout></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>
      </Route>
      <Route path="/users">
        <AdminRoute><Layout><UsersPage /></Layout></AdminRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
