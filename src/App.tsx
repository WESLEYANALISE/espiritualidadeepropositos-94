import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Assinaturas from "./pages/Assinaturas";
import Success from "./pages/Success";
import Lendo from "./pages/Lendo";
import PlanoLeitura from "./pages/PlanoLeitura";
import Favoritos from "./pages/Favoritos";
import Configuracoes from "./pages/Configuracoes";
import Luna from "./pages/Luna";
import NotFound from "./pages/NotFound";
import AdminPagos from "./pages/AdminPagos";
import RestoreAccess from "./pages/RestoreAccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/assinaturas" element={<ProtectedRoute><Assinaturas /></ProtectedRoute>} />
            <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
            <Route path="/restore-access" element={<RestoreAccess />} />
            <Route path="/lendo" element={<ProtectedRoute><Lendo /></ProtectedRoute>} />
            <Route path="/plano-leitura" element={<ProtectedRoute><PlanoLeitura /></ProtectedRoute>} />
            <Route path="/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/luna" element={<ProtectedRoute><Luna /></ProtectedRoute>} />
            <Route path="/admin/pagos" element={<ProtectedRoute><AdminPagos /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
