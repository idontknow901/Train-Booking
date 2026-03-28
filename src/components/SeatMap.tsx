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
  ArrowLeft,
  Check,
  Copy,
  Download
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

  const totalConfirmedCapacity = train.coaches.reduce((acc, c) => acc + (c.maxConfirmed || 0), 0);
  const trainBookings = bookings.filter(b => b.trainId === train.id && b.journeyDate === (journeyDate || train.availableDate));
  
  // REAL OCCUPIED SEAT COUNT (Sum of all seats in all bookings)
  const totalOccupiedSeats = trainBookings.reduce((acc, b) => acc + (b.seats?.length || 1), 0);
  
  const isFull = totalOccupiedSeats >= totalConfirmedCapacity;
  const isWL = totalOccupiedSeats >= totalConfirmedCapacity + (train.racLimit ?? 5);

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
    const booking = bookings.find(b => b.pnr === successPNR);
    return (
      <div className="max-w-xl mx-auto mt-10 space-y-4 animate-in zoom-in-95 duration-500">
        <div className="bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden p-8 text-center">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-6">Ticket Confirmed!</h2>
          
          <div className="bg-muted/30 rounded-xl p-6 border border-border/50 relative mb-6">
            <div className="relative pt-2 pb-6 px-4 flex items-center justify-between before:absolute before:left-8 before:right-8 before:h-[2px] before:bg-border before:top-[1.25rem] before:z-0">
           {train.route.map((stop, idx) => {
              const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
              const destIdx = train.route.findIndex(s => s.code === selectedDest);
              const isActive = idx >= originIdx && idx <= destIdx;

              return (
                <button 
                  key={stop.code}
                  onClick={() => handleTimelineClick(stop.code)}
                  className="relative z-10 flex flex-col items-center gap-2 group transition-all"
                >
                  <div className={`h-4 w-4 rounded-full border-2 transition-all ${isActive ? 'bg-accent border-accent scale-110 shadow-lg shadow-accent/20' : 'bg-background border-border group-hover:border-accent/50'}`} />
                  <span className={`text-[10px] font-black tracking-widest uppercase transition-colors whitespace-nowrap ${isActive ? 'text-accent' : 'text-muted-foreground/40'}`}>{stop.name}</span>
                </button>
              );
           })}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">PNR Number</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(successPNR); toast.success('PNR Copied!'); }}
                className="text-[10px] flex items-center gap-1 font-bold text-accent"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="text-4xl font-black text-accent tracking-[0.2em]">{successPNR}</p>
          </div>

          <div className="space-y-4 text-left border-y border-border/50 py-6 mb-8">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Passenger</span>
                <span className="font-bold text-foreground">{booking?.username}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Train</span>
                <span className="font-bold text-foreground">{booking?.trainName} (#{booking?.trainNumber})</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Route</span>
                <span className="font-bold text-accent">{booking?.origin} → {booking?.destination}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Coach / Seat</span>
                <span className="font-bold text-foreground">
                  {booking?.status === 'CNF' ? (
                    `${booking.coachType} / ${booking.seats.map(s => `Seat ${s.number} (${s.position})`).join(', ')}`
                  ) : (
                    booking?.status
                  )}
                </span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Journey Date</span>
                <span className="font-bold text-foreground">{booking?.journeyDate}</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic font-medium">This is an electronically generated ticket. No signature is required.</p>
        </div>

        <div className="flex flex-col gap-3">
            <Button variant="outline" className="rounded-2xl h-14 font-bold border-accent text-accent hover:bg-accent/5">
                <Download className="mr-2 h-4 w-4" /> Download PDF Ticket
            </Button>
            <Button onClick={onBack} className="rounded-2xl h-14 font-bold bg-[#1a365d] hover:bg-[#1a365d]/90 text-white">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
            </Button>
        </div>
      </div>
    );
  }

  const handleTimelineClick = (code: string) => {
    const idx = train.route.findIndex(s => s.code === code);
    const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
    const destIdx = train.route.findIndex(s => s.code === selectedDest);
    
    if (idx < destIdx) setSelectedOrigin(code);
    else if (idx > originIdx) setSelectedDest(code);
    setSelectedSeats([]);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="group flex items-center gap-2 hover:bg-accent/5 rounded-2xl">
          <ArrowLeft className="h-4 w-4 text-accent transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-bold uppercase tracking-widest text-accent">Adjust Search</span>
        </Button>
      </div>

      <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-foreground tracking-tight">{train.name}</h2>
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

        <div className="relative pt-6 pb-2 px-8 flex items-center justify-between before:absolute before:left-14 before:right-14 before:h-[2px] before:bg-border before:top-[2.25rem] before:z-0 overflow-x-auto scrollbar-hide">
           {train.route.map((stop, idx) => {
              const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
              const destIdx = train.route.findIndex(s => s.code === selectedDest);
              const isActive = idx >= originIdx && idx <= destIdx;

              return (
                <button 
                  key={stop.code}
                  onClick={() => handleTimelineClick(stop.code)}
                  className="relative z-10 flex flex-col items-center gap-3 min-w-[100px] group transition-all"
                >
                  <div className={`h-5 w-5 rounded-full border-2 transition-all ${isActive ? 'bg-accent border-accent scale-110 shadow-lg shadow-accent/20' : 'bg-background border-border group-hover:border-accent/40'}`} />
                  <span className={`text-[10px] font-black tracking-widest uppercase transition-colors whitespace-nowrap ${isActive ? 'text-accent' : 'text-muted-foreground/40'}`}>{stop.name}</span>
                </button>
              );
           })}
        </div>
      </div>

      <Tabs value={selectedCoach} onValueChange={v => { setSelectedCoach(v); setSelectedSeats([]); }}>
        <TabsList className="w-full h-12 p-1 bg-muted/20 border border-border rounded-xl flex overflow-x-auto overflow-y-hidden scrollbar-hide">
          {train.coaches.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="flex-1 min-w-[120px] rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {c.type} Class
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!isFull ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 min-w-max">
            {coach.seats.map(seat => {
              const isBooked = isSeatBooked(seat);
              const isSelected = selectedSeats.some(s => s.id === seat.id);
              
              let cls = 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10';
              if (isBooked || seat.isLocked) cls = 'bg-red-50 border-red-200 text-red-500 cursor-not-allowed';
              if (isSelected) cls = 'bg-accent border-accent text-accent-foreground shadow-md scale-[1.02] z-10 ring-2 ring-accent/10';

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  disabled={isBooked || seat.isLocked}
                  className={`relative group h-16 border rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${cls}`}
                >
                  <span className="text-xl font-black mb-0.5">{seat.number}</span>
                  <span className="text-[8px] uppercase font-black tracking-widest opacity-60">
                    {seat.position}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-accent/20 bg-accent/5 p-12 text-center">
            <Ticket className="h-10 w-10 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-black">Confirmed Seats General Full</h3>
            <p className="text-sm text-muted-foreground">Please book using the RAC/WL system below.</p>
        </div>
      )}

      <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-6 shadow-sm animate-in slide-in-from-bottom-5 duration-500">
         <div className="flex items-center gap-2 mb-4">
            <Ticket className="h-4 w-4 text-orange-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Current Queue Status</span>
         </div>
         <p className="text-2xl font-black text-foreground">
            {isFull ? (
              isWL ? `AVAILABLE - 0 | WL - ${String(totalOccupiedSeats - totalConfirmedCapacity - (train.racLimit || 5) + 1).padStart(2, '0')}` : `AVAILABLE - 0 | RAC - ${String(totalOccupiedSeats - totalConfirmedCapacity + 1).padStart(2, '0')}`
            ) : (
                // Coach specific availability correctly counting physical seats
              `AVAILABLE - ${String((coach.maxConfirmed || 0) - bookings
                .filter(b => b.trainId === train.id && b.journeyDate === (journeyDate || train.availableDate) && b.coachId === coach.id)
                .reduce((acc, b) => acc + (b.seats?.length || 1), 0)
              ).padStart(4, '0')} | RAC - 00 | WL - 00`
            )}
         </p>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-6 shadow-sm">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-orange-400" />
              <h3 className="text-xl font-black text-foreground">
                {selectedSeats.length > 0 ? (
                  `Seats ${selectedSeats.map(s => `#${s.number}`).join(', ')} — ${selectedSeats.map(s => s.position).join(', ')}`
                ) : (
                  'Passenger Assignment'
                )}
              </h3>
            </div>
            {selectedSeats.length > 1 && <Badge variant="secondary" className="bg-orange-100 text-orange-600 font-black">+ {selectedSeats.length - 1} more</Badge>}
         </div>

         <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="relative flex-1">
               <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
               <input
                 type="text"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 placeholder="Roblox Username"
                 className="w-full bg-white border border-border/60 rounded-2xl h-14 pl-14 pr-6 text-lg font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:border-orange-200 focus:ring-8 focus:ring-orange-100/50 transition-all shadow-sm"
               />
            </div>
            <Button
              onClick={handleBook}
              disabled={isBooking || (!isFull && selectedSeats.length === 0) || !username}
              className="h-14 px-10 rounded-2xl bg-[#ffcb74] hover:bg-[#ffbe54] text-[#8b5e1a] font-black text-lg gap-2 shadow-lg shadow-orange-200/50 transition-all active:scale-[0.98]"
            >
              {isBooking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ticket className="h-5 w-5" />}
              Generate Ticket
            </Button>
         </div>
      </div>
    </div>
  );
}

export default SeatMap;
