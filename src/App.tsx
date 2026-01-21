import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TimeRangeProvider } from "@/contexts/TimeRangeContext";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Wealth from "./pages/Wealth";
import Portfolio from "./pages/Portfolio";
import Cashflow from "./pages/Cashflow";
import Fire from "./pages/Fire";
import Projections from "./pages/Projections";
import Goals from "./pages/Goals";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Mortgage from "./pages/Mortgage";
import Retirement from "./pages/Retirement";
import Investments from "./pages/Investments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TimeRangeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/wealth" element={<ProtectedRoute><Wealth /></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
            <Route path="/cashflow" element={<ProtectedRoute><Cashflow /></ProtectedRoute>} />
            <Route path="/fire" element={<ProtectedRoute><Fire /></ProtectedRoute>} />
            <Route path="/projections" element={<ProtectedRoute><Projections /></ProtectedRoute>} />
            <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
            <Route path="/mortgage" element={<ProtectedRoute><Mortgage /></ProtectedRoute>} />
            <Route path="/retirement" element={<ProtectedRoute><Retirement /></ProtectedRoute>} />
            <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TimeRangeProvider>
  </QueryClientProvider>
);

export default App;
