import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { TrainProvider } from "@/context/TrainContext";
import { Ticket, Train, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import MyBookings from "./pages/MyBookings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TrainProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            {/* Global Navigation - Professional IRCTC Blue */}
            <nav className="border-b bg-[#213d77] shadow-lg sticky top-0 z-50">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className="bg-white p-1.5 rounded-xl shadow-inner">
                    <Train className="h-6 w-6 text-[#213d77]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-xl tracking-tighter leading-none">EPIC RAIL</span>
                    <span className="text-[10px] font-bold text-white/60 tracking-[0.2em] -mt-0.5">EST. 2026</span>
                  </div>
                </Link>
                
                <div className="flex items-center gap-2">
                  <Link to="/">
                    <Button variant="ghost" className="text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 px-4 py-2 h-10">
                      Home
                    </Button>
                  </Link>
                  <Link to="/bookings">
                    <Button variant="ghost" className="text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 px-4 py-2 h-10 flex items-center gap-2">
                      <Ticket className="h-4 w-4" /> Passenger Portal
                    </Button>
                  </Link>
                  <div className="h-6 w-px bg-white/20 mx-2" />
                  <Link to="/admin">
                    <Button variant="ghost" className="text-white/70 font-black text-xs uppercase tracking-widest hover:bg-white/10 px-4 py-2 h-10 flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Admin
                    </Button>
                  </Link>
                </div>
              </div>
            </nav>

            <main>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/bookings" element={<MyBookings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TrainProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
