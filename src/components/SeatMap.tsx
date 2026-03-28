import { useState } from 'react';
import { Train, Coach, Seat, Booking } from '@/types/train';
import { useTrainContext } from '@/context/TrainContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Ticket, 
  User, 
  Loader2, 
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface SeatMapProps {
  train: Train;
  onBack: () => void;
  origin: string;
  destination: string;
  journeyDate: string;
}

export function SeatMap({ train, onBack, origin, destination, journeyDate }: SeatMapProps) {
  const { bookSeat, bookings, settings } = useTrainContext();
  const [selectedOrigin, setSelectedOrigin] = useState(origin || train.route[0].code);
  const [selectedDest, setSelectedDest] = useState(destination || train.route[train.route.length - 1].code);
  const [selectedCoach, setSelectedCoach] = useState(train.coaches[0].id);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [username, setUsername] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [successPNR, setSuccessPNR] = useState<string | null>(null);

  const trainBookings = bookings.filter(b => b.trainId === train.id && b.journeyDate === (journeyDate || train.availableDate));
  const isFull = trainBookings.length >= (train.maxConfirmedSeats || 50);

  const coach = train.coaches.find(c => c.id === selectedCoach) || train.coaches[0];
  if (!coach) return <div className="p-8 text-center text-muted-foreground">No coach layout found for this train.</div>;

  const handleSeatClick = (seat: Seat) => {
    if (isSeatBooked(seat)) return;

    if (selectedSeats.find(s => s.id === seat.id)) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 4) {
        toast.error('You can only book up to 4 seats at once.');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const isSeatBooked = (seat: Seat) => {
    const journeyDateProp = journeyDate || train.availableDate || new Date().toISOString().split('T')[0];
    return bookings.some(b => {
      const isSameSegment = b.trainId === train.id && b.journeyDate === journeyDateProp;
      if (!isSameSegment) return false;
      
      // Safety check for BOTH new array structure and legacy single seat structure
      if (b.seats && Array.isArray(b.seats)) {
        return b.seats.some(s => s.number === seat.number && s.coachId === coach.id);
      }
      return (b as any).seatNumber === seat.number && b.coachId === coach.id;
    });
  };

  const handleBook = async () => {
    if (!username.trim()) {
      toast.error('Please enter your Roblox username');
      return;
    }
    if (!settings.bookingOpen) {
      toast.error('Booking is currently closed for maintenance');
      return;
    }
    if (!isFull && selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    setIsBooking(true);
    try {
      const result = await bookSeat(
        train.id,
        isFull ? null : selectedCoach,
        isFull ? null : coach.type,
        selectedOrigin,
        selectedDest,
        journeyDate,
        username,
        isFull ? [] : selectedSeats
      );
      if (result) {
        toast.success(`Ticket Booked! PNR: ${result.pnr}`);
        setSuccessPNR(result.pnr);
        setSelectedSeats([]);
        setUsername('');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to book seats');
    } finally {
      setIsBooking(false);
    }
  };

  if (successPNR) {
    return (
      <div className="rounded-[3rem] border border-border bg-card p-12 text-center shadow-2xl animate-in zoom-in-95 duration-500 max-w-lg mx-auto mt-10">
        <div className="h-24 w-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-accent/5">
          <Ticket className="h-12 w-12 text-accent" />
        </div>
        <h2 className="text-4xl font-black text-foreground mb-4">Ticket Confirmed!</h2>
        <div className="bg-muted/30 rounded-2xl p-6 mb-8 border border-border/50 relative overflow-hidden">
          <div className="absolute top-2 right-4 bg-accent/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-accent">Confirmed PNR</div>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Your PNR Number</p>
          <p className="text-5xl font-black text-accent tracking-tighter">{successPNR}</p>
        </div>
        <p className="text-muted-foreground text-sm mb-10 leading-relaxed px-4">Your reservation for <strong>{train.name}</strong> has been successfully processed. You can view it in your history.</p>
        <div className="flex flex-col gap-3">
            <Button onClick={onBack} size="lg" className="rounded-2xl h-14 text-lg font-bold bg-accent hover:bg-accent/90 text-accent-foreground">
                Back to Home
            </Button>
            <Button variant="ghost" onClick={() => setSuccessPNR(null)} className="text-xs font-bold uppercase tracking-widest opacity-50">
                Book Another Ticket
            </Button>
        </div>
      </div>
    );
  }

  const handleTimelineClick = (code: string) => {
    const idx = train.route.findIndex(s => s.code === code);
    const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
    const destIdx = train.route.findIndex(s => s.code === selectedDest);

    if (idx < destIdx && idx >= 0) {
       setSelectedOrigin(code);
       setSelectedSeats([]);
    } else if (idx > originIdx && idx < train.route.length) {
       setSelectedDest(code);
       setSelectedSeats([]);
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="rounded-xl border-border bg-card/50 backdrop-blur-sm shadow-sm md:flex hidden"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back To Search
        </Button>
      </div>

      {/* Reverted Journey Configuration Box */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Journey Configuration
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Customize your boarding and destination stations below</p>
          </div>

          <div className="flex items-center gap-2 bg-background p-1.5 rounded-2xl border border-border shadow-inner">
             <Select value={selectedOrigin} onValueChange={(v) => { setSelectedOrigin(v); setSelectedSeats([]); }}>
                  <SelectTrigger className="h-10 text-xs font-medium border-none bg-transparent hover:bg-muted/50 transition-colors w-40 px-4"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      {train.route.map((s, idx) => (
                          <SelectItem key={s.code} value={s.code} disabled={idx >= train.route.findIndex(x => x.code === selectedDest)}>{s.name} ({s.code})</SelectItem>
                      ))}
                  </SelectContent>
             </Select>
             <div className="h-8 w-px bg-border mx-1" />
             <Select value={selectedDest} onValueChange={(v) => { setSelectedDest(v); setSelectedSeats([]); }}>
                  <SelectTrigger className="h-10 text-xs font-medium border-none bg-transparent hover:bg-muted/50 transition-colors w-40 px-4"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      {train.route.map((s, idx) => (
                          <SelectItem key={s.code} value={s.code} disabled={idx <= train.route.findIndex(x => x.code === selectedOrigin)}>{s.name} ({s.code})</SelectItem>
                      ))}
                  </SelectContent>
             </Select>
          </div>
        </div>

        <div className="relative pt-2 pb-6 px-4">
          <div className="relative flex items-center justify-between before:absolute before:left-0 before:right-0 before:h-1 before:bg-muted before:top-1/2 before:-translate-y-1/2 before:z-0">
             {train.route.map((stop, idx) => {
                const isOrigin = stop.code === selectedOrigin;
                const isDest = stop.code === selectedDest;
                const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
                const destIdx = train.route.findIndex(s => s.code === selectedDest);
                
                let dotColor = 'bg-muted border-border';
                if (idx >= originIdx && idx <= destIdx) dotColor = 'bg-accent border-accent ring-4 ring-accent/10';

                return (
                  <button 
                    key={stop.code} 
                    onClick={() => handleTimelineClick(stop.code)}
                    className="relative z-10 flex flex-col items-center group"
                  >
                    <div className={`h-4 w-4 rounded-full ${dotColor} flex items-center justify-center transition-all duration-300 ${isOrigin || isDest ? 'scale-125 ring-8 ring-accent/10 bg-accent' : 'group-hover:scale-125 bg-muted'}`} />
                    <div className="absolute top-8 flex flex-col items-center">
                      <span className={`text-[10px] uppercase font-medium tracking-widest whitespace-nowrap transition-colors ${isOrigin || isDest ? 'text-accent font-bold' : 'text-muted-foreground group-hover:text-foreground'}`}>{stop.code}</span>
                    </div>
                  </button>
                );
             })}
          </div>
        </div>
      </div>

      <Tabs value={selectedCoach} onValueChange={v => { setSelectedCoach(v); setSelectedSeats([]); }}>
        <TabsList className="w-full h-12 p-1 bg-muted/20 border border-border rounded-xl">
          {train.coaches.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="flex-1 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {c.type} Class ({c.seats.length} Seats)
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!isFull ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 min-w-max">
            {coach.seats.map(seat => {
              const isBooked = isSeatBooked(seat);
              const isSelected = selectedSeats.some(s => s.id === seat.id);
              
              let cls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20';
              if (isBooked || seat.isLocked) cls = 'bg-destructive/10 border-destructive/20 text-destructive/50 cursor-not-allowed';
              if (isSelected) cls = 'bg-accent border-accent text-accent-foreground shadow-sm scale-110 z-10 ring-4 ring-accent/20';

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  disabled={isBooked || seat.isLocked}
                  className={`relative group aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${cls}`}
                >
                  <span className="text-lg font-black tracking-tighter opacity-80">{seat.number}</span>
                  {!isBooked && <span className="text-[9px] uppercase font-black tracking-widest mt-1 text-accent leading-none opacity-60">{seat.position}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-accent/20 bg-accent/5 p-12 text-center space-y-4">
            <div className="h-20 w-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                <Ticket className="h-10 w-10 text-accent" />
            </div>
            <h3 className="text-2xl font-black text-foreground">Confirmed Seats Sold Out</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">This train has reached its physical seat capacity. Next bookings will be assigned <strong>RAC</strong> or <strong>Waiting List</strong> status.</p>
        </div>
      )}

      {/* Integrated Booking Form (Scrollable) */}
      <div className="mt-8 pt-8 border-t border-border animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-4">
             <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Passenger Information</p>
             {selectedSeats.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                   {selectedSeats.map(s => (
                      <Badge key={s.id} variant="secondary" className="px-3 py-1 bg-accent/10 border-accent/20 text-accent font-black">
                         {s.number} ({s.position})
                      </Badge>
                   ))}
                </div>
             )}
          </div>

          <div className="relative group p-1">
             <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
             <input
               type="text"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               placeholder="Enter Roblox Username..."
               className="w-full bg-muted/30 border-2 border-border/50 rounded-2xl h-16 pl-14 pr-6 text-xl font-bold placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/40 focus:ring-8 focus:ring-accent/5 transition-all text-foreground"
             />
          </div>

          <Button
            onClick={handleBook}
            disabled={isBooking || (!isFull && selectedSeats.length === 0) || !username}
            className="w-full h-18 rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground text-2xl font-black shadow-xl shadow-accent/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 py-8"
          >
            {isBooking ? (
              <div className="flex items-center gap-3"><Loader2 className="h-6 w-6 animate-spin" /> Processing...</div>
            ) : (
              <div className="flex items-center gap-3"><Ticket className="h-6 w-6" /> {isFull ? 'BOOK RAC / WL TICKET' : 'CONFIRM & BOOK SEATS'}</div>
            )}
          </Button>
          
          <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest opacity-40 py-4">Total Amount: FREE (Simulation Only)</p>
        </div>
      </div>
    </div>
  );
}

export default SeatMap;
