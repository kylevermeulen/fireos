import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Wealth from "./pages/Wealth";
import Portfolio from "./pages/Portfolio";
import Cashflow from "./pages/Cashflow";
import Fire from "./pages/Fire";
import Projections from "./pages/Projections";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/wealth" element={<Wealth />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/cashflow" element={<Cashflow />} />
          <Route path="/fire" element={<Fire />} />
          <Route path="/projections" element={<Projections />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
