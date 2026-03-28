import React, { useState, useEffect } from 'react';
import { useTrainContext } from '@/context/TrainContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Train, Ticket, Calendar, MapPin, Search, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const MyBookings = () => {
  const { bookings, trains, cancelBooking } = useTrainContext();
  const [username, setUsername] = useState(localStorage.getItem('booking_username') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [cancellingPnr, setCancellingPnr] = useState<string | null>(null);

  const myBookings = bookings.filter(b => b.username.toLowerCase() === username.trim().toLowerCase())
    .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    localStorage.setItem('booking_username', username.trim());
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 500);
  };

  const handleCancel = async (pnr: string) => {
    if (!confirm('Are you sure you want to cancel this ticket? This action cannot be undone.')) return;
    
    setCancellingPnr(pnr);
    try {
      await cancelBooking(pnr);
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
        <h1 className="text-4xl font-extrabold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground italic">Review and manage your train tickets</p>
      </div>

      <Card className="border-none shadow-xl bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Enter your Roblox Username..." 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8 font-bold gap-2">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Fetch Tickets
            </Button>
          </form>
        </CardContent>
      </Card>

      {!username && (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50">
          <Train className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-medium">Enter your username to view your journey history</p>
        </div>
      )}

      {username && myBookings.length === 0 && !isSearching && (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/5">
          <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-medium">No bookings found for "{username}"</p>
          <p className="text-muted-foreground mt-2">Book a seat first to see it here!</p>
        </div>
      )}

      {myBookings.length > 0 && (
        <div className="grid gap-6">
          {myBookings.map((booking) => {
            const statusColor = booking.status === 'CNF' ? 'bg-emerald-500/10 text-emerald-600' : 
                              booking.status === 'RAC' ? 'bg-amber-500/10 text-amber-600' : 
                              'bg-destructive/10 text-destructive';
            
            return (
              <Card key={booking.pnr} className="overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 group">
                <div className={`h-1 ${booking.status === 'CNF' ? 'bg-emerald-500' : booking.status === 'RAC' ? 'bg-amber-500' : 'bg-destructive'}`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      {booking.trainName} 
                      <span className="text-sm font-normal text-muted-foreground">(#{booking.trainNumber})</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      PNR: <span className="font-mono font-bold text-foreground">{booking.pnr}</span>
                    </CardDescription>
                  </div>
                  <Badge className={`${statusColor} border-none font-black text-xs px-3 py-1`}>
                    {booking.status === 'CNF' ? 'CONFIRMED' : `${booking.status} / ${booking.queueNumber}`}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest leading-none">
                        <MapPin className="h-3 w-3" /> Boarding Station
                      </div>
                      <p className="text-lg font-extrabold">{booking.origin}</p>
                    </div>
                    
                    <div className="flex items-center justify-center py-4">
                       <div className="flex flex-col items-center gap-1 w-full relative">
                         <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent absolute" />
                         <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-2 transition-transform" />
                       </div>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest leading-none">
                        <MapPin className="h-3 w-3" /> Destination
                      </div>
                      <p className="text-lg font-extrabold">{booking.destination}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold">{booking.journeyDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold">
                          {booking.status === 'WL' ? 'WL Assigned' : `Coach: ${booking.coachId.split('-')[0]} / Seat: ${booking.seatNumber} (${booking.seatPosition})`}
                        </span>
                      </div>
                    </div>

                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="gap-2 font-bold shadow-sm"
                      onClick={() => handleCancel(booking.pnr)}
                      disabled={cancellingPnr === booking.pnr}
                    >
                      {cancellingPnr === booking.pnr ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Cancel Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
