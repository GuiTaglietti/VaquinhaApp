// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Auth Pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

// Protected Pages
import { DashboardPage } from "@/pages/DashboardPage";
import { FundraisersListPage } from "@/pages/FundraisersListPage";
import { FundraiserFormPage } from "@/pages/FundraiserFormPage";
import { ContributionsPage } from "@/pages/ContributionsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { BankAccountsPage } from "@/pages/BankAccountsPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { ExploreFundraiserPage } from "@/pages/ExploreFundraiserPage";
import { FundraiserControlPage } from "@/pages/FundraiserControlPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { InvoicesPage } from "@/pages/InvoicesPage";

// Public Pages
import { PublicFundraiserPage } from "@/pages/PublicFundraiserPage";
import { AuditPage } from "@/pages/AuditPage";
import { PublicHomePage } from "@/pages/PublicHomePage";

// 404
import NotFound from "./pages/NotFound";

// Email confirm
import ConfirmEmailResultPage from "@/pages/ConfirmEmailResultPage";

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
            iconTheme: { primary: "hsl(var(--success))", secondary: "white" },
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
          {/* PUBLIC */}
          <Route path="/" element={<PublicHomePage />} />
          <Route
            path="/explore"
            element={
              <PublicShell>
                <ExplorePage />
              </PublicShell>
            }
          />
          <Route
            path="/p/:slug"
            element={
              <PublicShell>
                <PublicFundraiserPage />
              </PublicShell>
            }
          />
          <Route path="/a/:token" element={<AuditPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route
            path="/auth/forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route path="/auth/reset" element={<ResetPasswordPage />} />
          <Route
            path="/auth/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route path="/auth/confirm" element={<ConfirmEmailResultPage />} />

          {/* PROTECTED (/app/...) */}
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
          <Route
            path="/app/fundraisers/:id/control"
            element={
              <ProtectedRoute>
                <AppShell>
                  <FundraiserControlPage />
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
            path="/app/security"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SecurityPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/invoices"
            element={
              <ProtectedRoute>
                <AppShell>
                  <InvoicesPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
