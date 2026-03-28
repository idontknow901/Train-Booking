import { useState } from 'react';
import { Train, Coach, Seat } from '@/types/train';
import { useTrainContext } from '@/context/TrainContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Ticket, User, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [username, setUsername] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Initialize Engine for Live Segmented Availability Check
  const allPhysicalSeats: { coachId: string; seat: Seat }[] = [];
  train.coaches.forEach(coach => {
    coach.seats.forEach(seat => allPhysicalSeats.push({ coachId: coach.id, seat }));
  });
  const physicalSeatIds = allPhysicalSeats.map(s => s.seat.id);

  // Constants (should match TrainContext)
  const SOFT_CAP = 30;
  const RAC_CAP = 40;

  const engine = new GameTrainBookingSystem(
    train.route.map(s => s.code),
    physicalSeatIds,
    SOFT_CAP,
    RAC_CAP
  );

  // Hydrate engine with existing bookings
  const currentTrainBookings = bookings.filter(b => b.trainId === train.id && b.journeyDate === journeyDate);
  const sortedBookings = currentTrainBookings.sort((a, b) => new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime());

  for (const existing of sortedBookings) {
    const rCheck = engine.isValidRoute(existing.origin, existing.destination);
    if (rCheck.valid) {
      engine.bookings.push({
        playerId: existing.username,
        startStation: existing.origin, endStation: existing.destination,
        startIndex: rCheck.startIndex, endIndex: rCheck.endIndex,
        status: (existing as any).status || 'CNF',
        seatId: existing.seatNumber ? `${existing.coachId}-${existing.seatNumber}` : null,
        queueNumber: (existing as any).queueNumber || 0
      });
      if (existing.seatNumber) {
        const realSeatId = allPhysicalSeats.find(s => s.coachId === existing.coachId && s.seat.number === existing.seatNumber)?.seat.id;
        if (realSeatId) {
          const eSeat = engine.seats.find(s => s.id === realSeatId);
          if (eSeat) eSeat.bookings.push(engine.bookings[engine.bookings.length - 1]);
        }
      }
    }
  }

  const coach = train.coaches.find(c => c.id === selectedCoach)!;

  const handleBook = async () => {
    if (!username.trim()) {
      toast.error('Please enter your Roblox username');
      return;
    }
    if (!settings.bookingOpen) {
      toast.error('Booking is currently closed for maintenance');
      return;
    }

    setIsBooking(true);

    try {
      const booking = await bookSeat(
          train.id, 
          selectedSeat ? selectedCoach : null, 
          selectedSeat ? selectedSeat.id : null, 
          username.trim(), 
          journeyDate, 
          selectedOrigin, 
          selectedDest
      );
      if (booking) {
        toast.success(`Ticket booked! PNR: ${booking.pnr}`);
        setConfirmedBooking(booking);
        setUsername('');
      } else {
        toast.error('Seat already booked or system error. Please try again.');
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error('Booking failed. Check your connection and try again.');
    } finally {
      setIsBooking(false);
    }
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
    setSelectedSeat(null);
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

        {/* Dynamic Origin / Dest Selectors */}
        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl border border-border">
           <Select value={selectedOrigin} onValueChange={(v) => { setSelectedOrigin(v); setSelectedSeat(null); }}>
               <SelectTrigger className="h-8 text-xs font-bold bg-background shadow-sm w-32"><SelectValue /></SelectTrigger>
               <SelectContent>
                   {train.route.map((s, idx) => (
                       <SelectItem key={s.code} value={s.code} disabled={idx >= train.route.findIndex(x => x.code === selectedDest)}>{s.name} ({s.code})</SelectItem>
                   ))}
               </SelectContent>
           </Select>
           <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
           <Select value={selectedDest} onValueChange={(v) => { setSelectedDest(v); setSelectedSeat(null); }}>
               <SelectTrigger className="h-8 text-xs font-bold bg-background shadow-sm w-32"><SelectValue /></SelectTrigger>
               <SelectContent>
                   {train.route.map((s, idx) => (
                       <SelectItem key={s.code} value={s.code} disabled={idx <= train.route.findIndex(x => x.code === selectedOrigin)}>{s.name} ({s.code})</SelectItem>
                   ))}
               </SelectContent>
           </Select>
        </div>
      </div>

      {!settings.bookingOpen && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          ⚠ Booking is currently closed for maintenance
        </div>
      )}

      {/* Journey Configuration Header */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Journey Configuration
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Customize your boarding and destination stations below</p>
          </div>

          <div className="flex items-center gap-2 bg-background p-1.5 rounded-2xl border border-border shadow-inner">
             <Select value={selectedOrigin} onValueChange={(v) => { setSelectedOrigin(v); setSelectedSeat(null); }}>
                 <SelectTrigger className="h-10 text-xs font-black border-none bg-transparent hover:bg-muted/50 transition-colors w-40 px-4"><SelectValue /></SelectTrigger>
                 <SelectContent>
                     {train.route.map((s, idx) => (
                         <SelectItem key={s.code} value={s.code} disabled={idx >= train.route.findIndex(x => x.code === selectedDest)}>{s.name} ({s.code})</SelectItem>
                     ))}
                 </SelectContent>
             </Select>
             <div className="h-8 w-px bg-border mx-1" />
             <Select value={selectedDest} onValueChange={(v) => { setSelectedDest(v); setSelectedSeat(null); }}>
                 <SelectTrigger className="h-10 text-xs font-black border-none bg-transparent hover:bg-muted/50 transition-colors w-40 px-4"><SelectValue /></SelectTrigger>
                 <SelectContent>
                     {train.route.map((s, idx) => (
                         <SelectItem key={s.code} value={s.code} disabled={idx <= train.route.findIndex(x => x.code === selectedOrigin)}>{s.name} ({s.code})</SelectItem>
                     ))}
                 </SelectContent>
             </Select>
          </div>
        </div>

        {/* Multi-Stop Timeline UI */}
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
                    <div className={`h-5 w-5 rounded-full border-2 ${dotColor} flex items-center justify-center transition-all duration-300 ${isOrigin || isDest ? 'scale-125 ring-8 ring-accent/20 bg-background' : 'group-hover:scale-125 bg-muted'}`} />
                    <div className="absolute top-8 flex flex-col items-center">
                      <span className={`text-[10px] uppercase font-black tracking-widest whitespace-nowrap transition-colors ${isOrigin || isDest ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'}`}>{stop.code}</span>
                    </div>
                  </button>
                );
             })}
          </div>
        </div>
      </div>

      <Tabs value={selectedCoach} onValueChange={v => { setSelectedCoach(v); setSelectedSeat(null); }}>
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
              <TabsTrigger key={c.id} value={c.id} className="flex-1 min-w-[80px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
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
              selectedSeat={selectedSeat} 
              onSelectSeat={s => setSelectedSeat(s.id === selectedSeat?.id ? null : s)} 
              engine={engine}
              selectedOrigin={selectedOrigin}
              selectedDest={selectedDest}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border bg-emerald-500/20 border-emerald-500/50" /> Available (CNF)</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border bg-amber-500/20 border-amber-500/50" /> RAC (Shared)</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border bg-destructive/20 border-destructive/50" /> Fully Booked</span>
        <span className="flex items-center gap-3 text-xs opacity-70 italic ml-auto">* Colors dynamic to selection</span>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
        <h3 className="mb-3 font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-5 w-5 text-accent" />
          {selectedSeat ? `Request Seat #${selectedSeat.number} (${selectedSeat.position})` : 'Join Auto-Queue (RAC/WL)'}
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          {selectedSeat 
            ? `Booking from ${selectedOrigin} to ${selectedDest}. Confirmed seat selected.`
            : `Booking from ${selectedOrigin} to ${selectedDest}. Auto-assigned status based on segment capacity.`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Roblox Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="pl-10 h-11"
              maxLength={50}
            />
          </div>
          <Button
            onClick={handleBook}
            disabled={!username.trim() || !settings.bookingOpen || isBooking}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold h-11 px-8"
          >
            {isBooking ? (
              <>Processing...</>
            ) : (
              <><Ticket className="mr-2 h-4 w-4" /> {selectedSeat ? 'Confirm Seat' : 'Book Auto-Ticket'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SeatGrid({ 
  coach, 
  selectedSeat, 
  onSelectSeat, 
  engine, 
  selectedOrigin, 
  selectedDest 
}: { 
  coach: Coach; 
  selectedSeat: Seat | null; 
  onSelectSeat: (s: Seat) => void;
  engine: GameTrainBookingSystem;
  selectedOrigin: string;
  selectedDest: string;
}) {
  const cols = 8;
  const rCheck = engine.isValidRoute(selectedOrigin, selectedDest);
  
  // Calculate Segmented Stats from actual engine bookings
  const segmentBookings = engine.bookings.filter(b => 
    GameTrainBookingSystem.segmentsOverlap(rCheck.startIndex, rCheck.endIndex, b.startIndex, b.endIndex)
  );
  
  const currentRAC = segmentBookings.filter(b => b.status === 'RAC').length;
  const currentWL = segmentBookings.filter(b => b.status === 'WL').length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto overflow-y-hidden">
        <div className="grid gap-2 min-w-[500px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(50px, 1fr))` }}>
          {coach.seats.map(seat => {
            const isSelected = selectedSeat?.id === seat.id;
            const seatBookings = engine.seats.find(es => es.id === seat.id)?.bookings.filter(b => 
               GameTrainBookingSystem.segmentsOverlap(rCheck.startIndex, rCheck.endIndex, b.startIndex, b.endIndex)
            ) || [];
            
            const isOccupied = seatBookings.length > 0;
            const isRAC = seatBookings.some(b => b.status === 'RAC');
            const isUnavailable = isOccupied || seat.isLocked;
            
            let cls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'; // Green
            if (isUnavailable) cls = 'bg-destructive/10 border-destructive/20 text-destructive/50 cursor-not-allowed'; // Red
            if (isRAC) cls = 'bg-amber-500/10 border-amber-500/30 text-amber-600 cursor-not-allowed'; // Yellow for RAC
            if (isSelected) cls = 'bg-accent border-accent text-accent-foreground shadow-sm scale-110 z-10'; // Blue for selection

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
                <span className="text-2xl font-black tracking-tighter">{displayStatus}</span>
                {!isUnavailable && <span className="text-xs uppercase font-black opacity-80 tracking-widest mt-0.5">{seat.position}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-black text-amber-600 tracking-widest leading-none">Segment Status</span>
            <span className="text-sm font-black text-amber-700">RAC Queue</span>
          </div>
          <p className="font-mono text-2xl font-black text-amber-600">
            {currentRAC > 0 ? `RAC ${currentRAC}` : 'AVAILABLE'}
          </p>
        </div>
        <div className="flex items-center justify-between p-4 rounded-2xl border border-destructive/20 bg-destructive/5">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-black text-destructive tracking-widest leading-none">Segment Status</span>
            <span className="text-sm font-black text-destructive-foreground/70">Waitlist</span>
          </div>
          <p className="font-mono text-2xl font-black text-destructive">
             {currentWL > 0 ? `WL ${currentWL}` : 'AVAILABLE'}
          </p>
        </div>
      </div>
    </div>
  );
}
