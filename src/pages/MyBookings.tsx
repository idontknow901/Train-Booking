import React, { useState } from 'react';
import { useTrainContext } from '@/context/TrainContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Train, Ticket, Calendar, MapPin, Search, Trash2, ArrowRight, Loader2, User, Hash, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const MyBookings = () => {
  const { bookings, trains, stations, cancelBooking } = useTrainContext();
  const [pnr, setPnr] = useState(localStorage.getItem('last_pnr_search') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [cancellingPnr, setCancellingPnr] = useState<string | null>(null);

  const foundBooking = bookings.find(b => b.pnr === pnr.trim());
  const [showDetails, setShowDetails] = useState(false);

  // Map station codes to full names
  const getStationName = (code: string) => {
      const station = stations.find(s => s.code === code);
      return station ? station.name : code;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnr.trim()) return;
    localStorage.setItem('last_pnr_search', pnr.trim());
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 500);
  };

  const handleCancel = async (bookingPnr: string) => {
    if (!confirm('Are you sure you want to cancel this ticket? This action cannot be undone.')) return;
    
    setCancellingPnr(bookingPnr);
    try {
      await cancelBooking(bookingPnr);
      toast.success('Ticket cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel ticket');
    } finally {
      setCancellingPnr(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">PNR Search</h1>
        <p className="text-muted-foreground italic">Track and manage your specific journey via PNR</p>
      </div>

      <Card className="border-none shadow-xl bg-gradient-to-br from-background to-muted/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Hash className="h-24 w-24 rotate-12" />
        </div>
        <CardContent className="pt-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 relative z-10">
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Enter 10-digit PNR Number..." 
                value={pnr}
                onChange={(e) => setPnr(e.target.value)}
                className="pl-12 h-14 bg-background/50 border-muted-foreground/30 focus-visible:ring-primary shadow-inner text-lg font-mono tracking-widest"
                maxLength={10}
              />
            </div>
            <Button type="submit" size="lg" className="h-14 px-10 font-black gap-2 text-lg shadow-lg hover:scale-105 transition-transform">
              {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              SEARCH
            </Button>
          </form>
        </CardContent>
      </Card>

      {!pnr && (
        <div className="text-center py-24 border-2 border-dashed rounded-[2.5rem] bg-muted/5 opacity-40">
          <Info className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-medium">Enter your 10-digit PNR to retrieve booking details</p>
        </div>
      )}

      {pnr && !foundBooking && !isSearching && (
        <div className="text-center py-24 border-2 border-dashed rounded-[2.5rem] bg-destructive/5 text-destructive border-destructive/20 animate-in zoom-in-50 duration-300">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-2xl font-black">PNR NOT FOUND</p>
          <p className="mt-2 font-medium opacity-70">Please check the digit or ensure the ticket isn't already cancelled.</p>
        </div>
      )}

      {foundBooking && (
        <div className="animate-in fade-in zoom-in-95 duration-500 delay-100">
          <Card className="overflow-hidden border-none shadow-2xl relative bg-card">
            <div className={`h-2 ${foundBooking.status === 'CNF' ? 'bg-emerald-500' : foundBooking.status === 'RAC' ? 'bg-amber-500' : 'bg-destructive'}`} />
            
            <CardHeader className="bg-muted/30 pb-6 px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <Train className="h-3 w-3" /> Train Information
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tighter">
                    {foundBooking.trainName} 
                    <span className="text-lg font-medium text-muted-foreground ml-2">(#{foundBooking.trainNumber})</span>
                  </CardTitle>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={`border-none font-black text-xs px-4 py-1.5 shadow-sm ${
                       foundBooking.currentStatus === 'CNF' ? 'bg-emerald-500/10 text-emerald-600' : 
                       foundBooking.currentStatus === 'RAC' ? 'bg-amber-500/10 text-amber-600' : 
                       'bg-destructive/10 text-destructive'
                    }`}>
                      {foundBooking.currentStatus === 'CNF' ? 'CONFIRMED' : `${foundBooking.currentStatus} Q-${foundBooking.queueNumber}`}
                    </Badge>
                    <div className="flex flex-col items-end">
                       <p className="text-[10px] font-black uppercase text-muted-foreground">Status tracking live</p>
                       <p className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-0.5">Booked as: <span className="text-accent">{foundBooking.initialStatus}</span></p>
                    </div>
                 </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
               <div className="p-8 space-y-8 cursor-pointer hover:bg-muted/5 transition-colors" onClick={() => setShowDetails(!showDetails)}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-muted/10 p-6 rounded-3xl border border-border/50">
                    <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Boarding From</span>
                      <p className="text-xl md:text-2xl font-black tracking-tighter leading-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                          {getStationName(foundBooking.origin)}
                          <span className="text-sm font-medium opacity-50 block font-mono">({foundBooking.origin})</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent relative">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-1 border rounded-full shadow-sm">
                            <ArrowRight className="h-4 w-4 text-primary animate-pulse" />
                         </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 items-center md:items-end text-center md:text-right">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Destination Station</span>
                      <p className="text-xl md:text-2xl font-black tracking-tighter leading-tight bg-gradient-to-l from-foreground to-muted-foreground bg-clip-text text-transparent">
                          {getStationName(foundBooking.destination)}
                          <span className="text-sm font-medium opacity-50 block font-mono">({foundBooking.destination})</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="flex flex-col gap-1 bg-muted/20 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Passenger</span>
                        <div className="flex items-center gap-2 mt-1">
                           <User className="h-4 w-4 text-accent" />
                           <span className="font-bold">{foundBooking.username}</span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-1 bg-muted/20 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Seat Allocation</span>
                        <div className="flex items-center gap-2 mt-1">
                           <Ticket className="h-4 w-4 text-accent" />
                           <span className="font-bold">
                             {foundBooking.status === 'WL' ? 'WAITLISTED' : `Coach ${foundBooking.coachId.split('-')[0]} / ${foundBooking.seatNumber} (${foundBooking.seatPosition})`}
                           </span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-1 bg-muted/20 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Journey Date</span>
                        <div className="flex items-center gap-2 mt-1">
                           <Calendar className="h-4 w-4 text-accent" />
                           <span className="font-bold">{foundBooking.journeyDate}</span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-1 bg-muted/20 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Coach Class</span>
                        <div className="flex items-center gap-2 mt-1 font-bold">
                            <Badge variant="secondary" className="font-black text-[10px]">{foundBooking.coachType}</Badge>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-muted/30 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-border/50">
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Transaction Info</span>
                        <p className="text-xs font-bold opacity-60">Booked at {new Date(foundBooking.bookedAt).toLocaleString()}</p>
                     </div>
                  </div>

                  <Button 
                    variant="destructive" 
                    size="lg" 
                    className="h-14 px-10 font-black gap-3 text-lg rounded-2xl shadow-xl hover:scale-105 transition-all"
                    onClick={() => handleCancel(foundBooking.pnr)}
                    disabled={cancellingPnr === foundBooking.pnr}
                  >
                    {cancellingPnr === foundBooking.pnr ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                    CANCEL TICKET
                  </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
