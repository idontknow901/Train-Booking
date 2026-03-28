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
            {/* Global Navigation */}
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 font-black text-xl hover:opacity-80 transition-opacity">
                  <span className="bg-primary text-primary-foreground p-1 rounded-lg">
                    <Train className="h-5 w-5" />
                  </span>
                  EPIC RAIL
                </Link>
                
                <div className="flex items-center gap-4">
                  <Link to="/bookings">
                    <Button variant="ghost" className="font-bold flex items-center gap-2">
                      <Ticket className="h-4 w-4" /> My Bookings
                    </Button>
                  </Link>
                  <Link to="/admin">
                    <Button variant="ghost" className="font-bold flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
