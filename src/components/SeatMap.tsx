import { useState, useMemo } from 'react';
import { Train, Coach, Seat } from '@/types/train';
import { useTrainContext } from '@/context/TrainContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Ticket, User, MapPin, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import BookingConfirmation from './BookingConfirmation';
import { Booking } from '@/types/train';
import { GameTrainBookingSystem } from '@/lib/bookingEngine';

interface SeatMapProps {
  train: Train;
  journeyDate: string;
  origin: string;
  destination: string;
  onBack: () => void;
}

export default function SeatMap({ train: initialTrain, journeyDate, origin, destination, onBack }: SeatMapProps) {
  const { bookSeat, settings, trains, bookings } = useTrainContext();
  const train = trains.find(t => t.id === initialTrain.id) || initialTrain;

  const [selectedOrigin, setSelectedOrigin] = useState(origin);
  const [selectedDest, setSelectedDest] = useState(destination);
  const [selectedCoach, setSelectedCoach] = useState(train.coaches[0].id);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [username, setUsername] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const coach = train.coaches.find(c => c.id === selectedCoach)!;

  // Initialize Engine for Live Segmented Availability Check for THIS COACH CLASS
  const classCoaches = train.coaches.filter(c => c.type === coach.type);
  const classPhysicalSeats: { coachId: string; seat: Seat }[] = [];
  classCoaches.forEach(c => {
    c.seats.forEach(seat => classPhysicalSeats.push({ coachId: c.id, seat }));
  });
  const physicalSeatIds = classPhysicalSeats.map(s => s.seat.id);

  // Constants (Must match TrainContext)
  const totalPhysicalSeats = classPhysicalSeats.length;
  const SOFT_CAP = classCoaches[0]?.maxConfirmed || Math.floor(totalPhysicalSeats * 0.9);
  const RAC_OVERFLOW = (coach.type === 'SL' ? 8 : 4);
  const RAC_CAP = SOFT_CAP + RAC_OVERFLOW;

  const engine = new GameTrainBookingSystem(
    train.route.map(s => s.code),
    physicalSeatIds,
    SOFT_CAP,
    RAC_CAP
  );

  // Hydrate engine with existing bookings for this class
  const currentClassBookings = bookings.filter(b => b.trainId === train.id && b.journeyDate === journeyDate && b.coachType === coach.type);
  const sortedBookings = currentClassBookings.sort((a, b) => new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime());

  for (const existing of sortedBookings) {
    const rCheck = engine.isValidRoute(existing.origin, existing.destination);
    if (rCheck.valid) {
      const eb = {
        playerId: existing.username,
        startStation: existing.origin, endStation: existing.destination,
        startIndex: rCheck.startIndex, endIndex: rCheck.endIndex,
        status: existing.status as any || 'CNF',
        seatId: existing.seatNumber ? classPhysicalSeats.find(cps => cps.coachId === existing.coachId && cps.seat.number === existing.seatNumber)?.seat.id || null : null,
        queueNumber: existing.queueNumber || 0
      };
      engine.bookings.push(eb);
      if (eb.seatId) {
        const eSeat = engine.seats.find(s => s.id === eb.seatId);
        if (eSeat) eSeat.bookings.push(eb);
      }
    }
  }

  const handleBook = async () => {
    if (!username.trim()) {
      toast.error('Please enter your Roblox username');
      return;
    }
    if (!settings.bookingOpen) {
      toast.error('Booking is currently closed for maintenance');
      return;
    }

    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    setIsBooking(true);

    try {
      let firstBooking: Booking | null = null;
      
      for (const seat of selectedSeats) {
        const booking = await bookSeat(
          train.id, 
          selectedCoach, 
          coach.type,
          seat.id, 
          username.trim(), 
          journeyDate, 
          selectedOrigin, 
          selectedDest
        );
        if (booking && !firstBooking) firstBooking = booking;
      }

      if (firstBooking) {
        setConfirmedBooking(firstBooking);
        toast.success(`Succesfully booked ${selectedSeats.length} seats!`);
      } else {
        toast.error('Booking failed. Check your connection and try again.');
      }
    } catch (e: any) {
      toast.error('Booking failed: ' + e.message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeats(prev => {
        const isAlreadySelected = prev.find(s => s.id === seat.id);
        if (isAlreadySelected) {
            return prev.filter(s => s.id !== seat.id);
        }
        if (prev.length >= 4) {
            toast.error('You can only book up to 4 seats at once.');
            return prev;
        }
        return [...prev, seat];
    });
  };

  const handleTimelineClick = (code: string) => {
    const idx = train.route.findIndex(s => s.code === code);
    const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
    const destIdx = train.route.findIndex(s => s.code === selectedDest);

    if (idx < destIdx) {
      setSelectedOrigin(code);
    } else if (idx > originIdx) {
      setSelectedDest(code);
    }
    setSelectedSeats([]);
  };

  if (confirmedBooking) {
    return <BookingConfirmation booking={confirmedBooking} onClose={() => { setConfirmedBooking(null); onBack(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{train.name} <span className="font-mono text-accent">#{train.number}</span></h2>
            <p className="text-sm text-muted-foreground">{journeyDate}</p>
          </div>
        </div>
      </div>

      {!settings.bookingOpen && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          ⚠ Booking is currently closed for maintenance
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Boarding Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-[2rem] opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
          <div className="relative bg-card rounded-[2rem] p-6 shadow-xl border border-border/50">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600/70">BOARDING STATION</span>
              </div>
              
              <Select value={selectedOrigin} onValueChange={(v) => { setSelectedOrigin(v); setSelectedSeats([]); }}>
                <SelectTrigger className="h-auto border-none p-0 bg-transparent text-2xl font-black tracking-tighter focus:ring-0 leading-tight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card shadow-2xl">
                  {train.route.map((s, idx) => (
                    <SelectItem key={s.code} value={s.code} disabled={idx >= train.route.findIndex(x => x.code === selectedDest)} className="rounded-xl font-bold py-3">
                      {s.name} <span className="text-xs opacity-50 ml-1 font-mono uppercase">({s.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1 w-12 rounded-full bg-emerald-500/20" />
                <span className="text-[10px] font-black font-mono text-muted-foreground tracking-widest uppercase">ORIGIN PORT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Destination Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-[#213d77] rounded-[2rem] opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
          <div className="relative bg-[#213d77] rounded-[2rem] p-6 shadow-xl border-none">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-white/10 text-white/70">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">DROPPING STATION</span>
              </div>
              
              <Select value={selectedDest} onValueChange={(v) => { setSelectedDest(v); setSelectedSeats([]); }}>
                <SelectTrigger className="h-auto border-none p-0 bg-transparent text-2xl font-black tracking-tighter focus:ring-0 leading-tight text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card shadow-2xl">
                  {train.route.map((s, idx) => (
                    <SelectItem key={s.code} value={s.code} disabled={idx <= train.route.findIndex(x => x.code === selectedOrigin)} className="rounded-xl font-bold py-3">
                      {s.name} <span className="text-xs opacity-50 ml-1 font-mono uppercase">({s.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1 w-12 rounded-full bg-white/20" />
                <span className="text-[10px] font-black font-mono text-white/40 tracking-widest uppercase">END TERMINAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Multi-Stop Timeline */}
      <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
        <div className="absolute top-0 left-0 w-2 h-full bg-accent opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative flex items-center justify-between before:absolute before:left-0 before:right-0 before:h-2 before:bg-muted/50 before:top-1/2 before:-translate-y-1/2 before:rounded-full before:z-0 px-4">
           {train.route.map((stop, idx) => {
              const isOrigin = stop.code === selectedOrigin;
              const isDest = stop.code === selectedDest;
              const originIdx = train.route.findIndex(s => s.code === selectedOrigin);
              const destIdx = train.route.findIndex(s => s.code === selectedDest);
              
              let dotColor = 'bg-muted/80 border-border';
              if (idx >= originIdx && idx <= destIdx) dotColor = 'bg-emerald-500 border-emerald-500 scale-125 ring-4 ring-emerald-500/20';
              if (isDest) dotColor = 'bg-blue-500 border-blue-500 scale-150 ring-8 ring-blue-500/20';

              return (
                <button 
                  key={stop.code} 
                  onClick={() => handleTimelineClick(stop.code)}
                  className="relative z-10 flex flex-col items-center group/stop"
                >
                  <div className={`h-4 w-4 rounded-full border-4 ${dotColor} flex items-center justify-center transition-all duration-500 ${isOrigin || isDest ? 'animate-pulse' : 'hover:scale-125'}`} />
                  <div className="absolute top-8 flex flex-col items-center">
                    <span className={`text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-colors bg-card px-2 py-0.5 rounded-full border border-border/50 ${isOrigin || isDest ? 'opacity-100 scale-110 shadow-sm' : 'opacity-40 group-hover/stop:opacity-100'}`}>
                      {stop.name}
                    </span>
                  </div>
                </button>
              );
           })}
        </div>
      </div>

      <Tabs value={selectedCoach} onValueChange={v => { setSelectedCoach(v); setSelectedSeats([]); }}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted p-1">
          {train.coaches.map(c => {
            const rCheck = engine.isValidRoute(selectedOrigin, selectedDest);
            const availInCoach = c.seats.filter(s => {
              const isOccupied = engine.seats.find(es => es.id === s.id)?.bookings.some(b => 
                GameTrainBookingSystem.segmentsOverlap(rCheck.startIndex, rCheck.endIndex, b.startIndex, b.endIndex)
              );
              return !isOccupied && !s.isLocked;
            }).length;

            return (
              <TabsTrigger key={c.id} value={c.id} onClick={() => setSelectedSeats([])} className="flex-1 min-w-[80px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <span className="font-semibold">{c.type}</span>
                <span className="ml-1 text-xs opacity-75">({availInCoach})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {train.coaches.map(c => (
          <TabsContent key={c.id} value={c.id}>
            <SeatGrid 
              coach={c} 
              selectedSeats={selectedSeats} 
              onSelectSeat={handleSeatClick} 
              engine={engine}
              train={train}
              bookings={bookings}
              journeyDate={journeyDate}
              selectedOrigin={selectedOrigin}
              selectedDest={selectedDest}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sticky bottom-4 z-40 animate-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="flex-1 w-full space-y-4">
             <div className="flex flex-wrap gap-2">
                {selectedSeats.length > 0 ? (
                    selectedSeats.map(s => (
                        <Badge key={s.id} variant="secondary" className="px-3 py-1 bg-accent/10 border-accent/20 text-accent font-bold">
                            {coach.type} - {s.number} ({s.position})
                        </Badge>
                    ))
                ) : (
                    <p className="text-sm font-medium text-muted-foreground italic">No seats selected yet • Max 4 seats</p>
                )}
             </div>
             
             <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter Roblox Username..."
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-background border-border focus:ring-accent"
                  />
                </div>
                <Button
                  onClick={handleBook}
                  disabled={isBooking || selectedSeats.length === 0}
                  className="h-12 px-8 font-black gap-2 w-full md:w-auto shadow-lg hover:scale-105 transition-all bg-[#1a365d] hover:bg-[#2c5282] rounded-xl"
                >
                  {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  BOOK {selectedSeats.length > 0 ? `${selectedSeats.length} SEATS` : 'NOW'}
                </Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeatGrid({ 
  coach, 
  selectedSeats, 
  onSelectSeat, 
  engine, 
  train,
  bookings,
  journeyDate,
  selectedOrigin, 
  selectedDest 
}: { 
  coach: Coach; 
  selectedSeats: Seat[]; 
  onSelectSeat: (s: Seat) => void;
  engine: GameTrainBookingSystem;
  train: Train;
  bookings: Booking[];
  journeyDate: string;
  selectedOrigin: string;
  selectedDest: string;
}) {
  const cols = 8;
  const rCheck = engine.isValidRoute(selectedOrigin, selectedDest);
  
  // Calculate Segmented Stats from actual engine bookings for THIS coach type
  const classBookings = bookings.filter(b => {
      if (b.trainId !== train.id || b.journeyDate !== journeyDate) return false;
      const bRoute = engine.isValidRoute(b.origin, b.destination);
      if (!bRoute.valid) return false;
      const isOverlapping = GameTrainBookingSystem.segmentsOverlap(rCheck.startIndex, rCheck.endIndex, bRoute.startIndex, bRoute.endIndex);
      return isOverlapping && b.coachType === coach.type;
  });

  const currentRAC = classBookings.filter(b => b.currentStatus === 'RAC').length;
  const currentWL = classBookings.filter(b => b.currentStatus === 'WL').length;
  const availability = engine.getAvailabilityForSegment(rCheck.startIndex, rCheck.endIndex);

  // --- SEEDED SCARCITY SYSTEM ---
  const selectableSeatIds = useMemo(() => {
    // 1. If cap is 0, nothing is selectable
    if ((coach.maxConfirmed || 0) <= 0) return new Set<string>();

    // 2. Deterministic Shuffle using Coach ID as Seed
    const seedString = coach.id + train.id;
    let seed = 0;
    for(let i=0; i<seedString.length; i++) seed += seedString.charCodeAt(i);
    
    // Custom random generator for consistent shuffle
    const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const allPhysicalSeats = coach.seats;
    const shuffled = [...allPhysicalSeats].sort(() => seededRandom() - 0.5);
    
    // Only pick EXACTLY maxConfirmed seats to be "Sales Open"
    return new Set(shuffled.slice(0, coach.maxConfirmed).map(s => s.id));
  }, [coach.id, coach.maxConfirmed]);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto overflow-y-hidden">
        <div className="grid gap-2 min-w-[500px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(50px, 1fr))` }}>
          {coach.seats.map(seat => {
            const isSelected = selectedSeats.find(s => s.id === seat.id);
            const seatBookings = engine.seats.find(es => es.id === seat.id)?.bookings.filter(b => 
               GameTrainBookingSystem.segmentsOverlap(rCheck.startIndex, rCheck.endIndex, b.startIndex, b.endIndex)
            ) || [];
            
            const isOccupied = seatBookings.length > 0;
            const isRAC = seatBookings.some(b => b.status === 'RAC');
            const isSelectable = selectableSeatIds.has(seat.id);
            const isLocked = !isSelectable && !isOccupied; // Empty but not for sale
            const isUnavailable = isOccupied || seat.isLocked || isLocked;
            
            let cls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'; // Green
            if (isLocked) cls = 'bg-destructive/5 border-destructive/10 text-destructive/40 bg-stripes pointer-events-none opacity-40 cursor-not-allowed'; // Greyish Red / Locked
            if (isOccupied) cls = 'bg-destructive/10 border-destructive/20 text-destructive/50 cursor-not-allowed'; // Real Red / Booked
            if (isRAC) cls = 'bg-amber-500/10 border-amber-500/30 text-amber-600 cursor-not-allowed'; // Yellow for RAC
            if (isSelected) cls = 'bg-accent border-accent text-accent-foreground shadow-sm scale-110 z-10 ring-4 ring-accent/20'; // Blue for selection

            let displayStatus = String(seat.number);
            let displaySub = seat.position.substring(0, 1) + (seat.position.includes(' ') ? seat.position.split(' ')[1].substring(0, 1) : '');

            return (
              <button
                key={seat.id}
                className={`flex flex-col h-20 w-full items-center justify-center rounded-2xl border-2 transition-all duration-300 ${cls} ${isUnavailable ? 'opacity-30' : 'shadow-sm active:scale-95'}`}
                onClick={() => !isUnavailable && onSelectSeat(seat)}
                disabled={isUnavailable}
                title={`${seat.number} - ${seat.position}${isOccupied ? ` (Booked for this segment)` : seat.isLocked ? ` (Locked by Capacity)` : ''}`}
              >
                <span className="text-lg font-medium tracking-tighter opacity-80">{displayStatus}</span>
                {!isUnavailable && <span className="text-[10px] uppercase font-black tracking-widest mt-1 text-accent leading-none">{seat.position}</span>}
                {isLocked && <div className="absolute top-1 right-1 opacity-20"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        {availability.status === 'AVAILABLE' ? (
            <div className={`p-5 rounded-[2rem] flex-1 border-2 border-emerald-500/30 bg-emerald-50/50 shadow-sm transition-all animate-in zoom-in-95 backdrop-blur-sm`}>
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70 mb-1">Coach Inventory</span>
                    <span className="text-2xl font-black text-emerald-700 tracking-tighter leading-none italic">AVAILABLE</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-emerald-800 tracking-tighter leading-none">{availability.count}</span>
                    <span className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-widest mt-1">Confirmed Seats</span>
                  </div>
               </div>
            </div>
        ) : availability.status === 'RAC' ? (
            <div className={`p-5 rounded-[2rem] flex-1 border-2 border-amber-500/30 bg-amber-50/50 shadow-sm transition-all animate-in zoom-in-95 backdrop-blur-sm`}>
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70 mb-1">Reservation Status</span>
                    <span className="text-2xl font-black text-amber-700 tracking-tighter leading-none italic">RAC</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-amber-800 tracking-tighter leading-none">{availability.count}</span>
                    <span className="text-[10px] font-bold text-amber-600/50 uppercase tracking-widest mt-1">Available slots</span>
                  </div>
               </div>
            </div>
        ) : (
            <div className={`p-5 rounded-[2rem] flex-1 border-2 border-destructive/30 bg-destructive/50 shadow-sm transition-all animate-in zoom-in-95 backdrop-blur-sm`}>
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/70 mb-1">Train Status</span>
                    <span className="text-2xl font-black text-destructive tracking-tighter leading-none italic">WAITLIST</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-destructive tracking-tighter leading-none">{availability.count}</span>
                    <span className="text-[10px] font-bold text-destructive/50 uppercase tracking-widest mt-1">In Queue</span>
                  </div>
               </div>
            </div>
        )}
      </div>
    </div>
  );
}
