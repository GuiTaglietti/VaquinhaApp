import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout Components
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Auth Pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";

// Protected Pages
import { DashboardPage } from "@/pages/DashboardPage";
import { FundraisersListPage } from "@/pages/FundraisersListPage";
import { FundraiserFormPage } from "@/pages/FundraiserFormPage";
import { ContributionsPage } from "@/pages/ContributionsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { BankAccountsPage } from "@/pages/BankAccountsPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { ExploreFundraiserPage } from "@/pages/ExploreFundraiserPage";

// Public Pages
import { PublicFundraiserPage } from "@/pages/PublicFundraiserPage";
import { AuditPage } from "@/pages/AuditPage";

// 404 Page
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HotToaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            border: "1px solid hsl(var(--border))",
          },
          success: {
            iconTheme: {
              primary: "hsl(var(--success))",
              secondary: "white",
            },
          },
          error: {
            iconTheme: {
              primary: "hsl(var(--destructive))",
              secondary: "white",
            },
          },
        }}
      />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/p/:slug" element={<PublicFundraiserPage />} />
          <Route path="/a/:token" element={<AuditPage />} />

          {/* Protected Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/fundraisers"
            element={
              <ProtectedRoute>
                <AppShell>
                  <FundraisersListPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/fundraisers/new"
            element={
              <ProtectedRoute>
                <AppShell>
                  <FundraiserFormPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/fundraisers/:id/edit"
            element={
              <ProtectedRoute>
                <AppShell>
                  <FundraiserFormPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/contributions"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ContributionsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/bank-accounts"
            element={
              <ProtectedRoute>
                <AppShell>
                  <BankAccountsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/explore"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ExplorePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/explore/:slug"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ExploreFundraiserPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/app" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
