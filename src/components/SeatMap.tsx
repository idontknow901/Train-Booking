import { useState } from 'react';
import { Train, Coach, Seat } from '@/types/train';
import { useTrainContext } from '@/context/TrainContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Ticket, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import BookingConfirmation from './BookingConfirmation';
import { Booking } from '@/types/train';

interface SeatMapProps {
  train: Train;
  journeyDate: string;
  origin: string;
  destination: string;
  onBack: () => void;
}

export default function SeatMap({ train: initialTrain, journeyDate, origin, destination, onBack }: SeatMapProps) {
  const { bookSeat, settings, trains } = useTrainContext();
  const train = trains.find(t => t.id === initialTrain.id) || initialTrain;

  const [selectedCoach, setSelectedCoach] = useState(train.coaches[0].id);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [username, setUsername] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBooking, setIsBooking] = useState(false);

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
      // Pass null for seatId if they didn't explicitly select a seat to default to RAC/WL queue behaviors
      const booking = await bookSeat(
          train.id, 
          selectedSeat ? selectedCoach : null, 
          selectedSeat ? selectedSeat.id : null, 
          username.trim(), 
          journeyDate, 
          origin, 
          destination
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

  if (confirmedBooking) {
    return <BookingConfirmation booking={confirmedBooking} onClose={() => { setConfirmedBooking(null); onBack(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{train.name} <span className="font-mono text-accent">#{train.number}</span></h2>
          <p className="text-sm text-muted-foreground">{origin} → {destination} | {journeyDate}</p>
        </div>
      </div>

      {!settings.bookingOpen && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          ⚠ Booking is currently closed for maintenance
        </div>
      )}

      {/* Multi-Stop Timeline UI */}
      <div className="rounded-xl border border-border bg-card p-5 overflow-hidden">
        <h3 className="mb-4 font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Journey Timeline
        </h3>
        <div className="relative flex items-center justify-between before:absolute before:left-0 before:right-0 before:h-0.5 before:bg-muted before:top-1/2 before:-translate-y-1/2 before:z-0">
           {train.route.map((stop, idx) => {
              const isOrigin = stop.code === origin;
              const isDest = stop.code === destination;
              const originIdx = train.route.findIndex(s => s.code === origin);
              const destIdx = train.route.findIndex(s => s.code === destination);
              
              let dotColor = 'bg-muted border-border';
              if (idx >= originIdx && idx <= destIdx) dotColor = 'bg-accent border-accent';

              return (
                <div key={stop.code} className="relative z-10 flex flex-col items-center gap-2 group">
                  <div className={`h-4 w-4 rounded-full border-2 ${dotColor} flex items-center justify-center transition-all ${isOrigin || isDest ? 'scale-125 ring-4 ring-accent/20' : ''}`} />
                  <div className="absolute top-6 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">{stop.code}</span>
                  </div>
                </div>
              );
           })}
        </div>
        <div className="h-6" /> {/* spacer */}
      </div>

      <Tabs value={selectedCoach} onValueChange={v => { setSelectedCoach(v); setSelectedSeat(null); }}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted p-1">
          {train.coaches.map(c => {
            const avail = c.seats.filter(s => !s.isBooked && !s.isLocked).length;
            return (
              <TabsTrigger key={c.id} value={c.id} className="flex-1 min-w-[80px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <span className="font-semibold">{c.type}</span>
                <span className="ml-1 text-xs opacity-75">({avail})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {train.coaches.map(c => (
          <TabsContent key={c.id} value={c.id}>
            <SeatGrid coach={c} selectedSeat={selectedSeat} onSelectSeat={s => setSelectedSeat(s.id === selectedSeat?.id ? null : s)} />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border bg-emerald-500/20 border-emerald-500/50" /> Selectable (CNF)</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border bg-destructive/20 border-destructive/50" /> Locked / Taken</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border bg-accent text-accent-foreground" /> Selected</span>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
        <h3 className="mb-3 font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-5 w-5 text-accent" />
          {selectedSeat ? `Request Seat #${selectedSeat.number} (${selectedSeat.position})` : 'Join Auto-Queue (RAC/WL)'}
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          {selectedSeat 
            ? 'You have selected a Confirmed seat. Enter your username to lock it in.'
            : 'No seat selected. Enter your username to be auto-assigned a Confirmed Seat, RAC, or Waitlist based on live dynamic capacity limits.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Roblox Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="pl-10"
              maxLength={50}
            />
          </div>
          <Button
            onClick={handleBook}
            disabled={!username.trim() || !settings.bookingOpen || isBooking}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
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

function SeatGrid({ coach, selectedSeat, onSelectSeat }: { coach: Coach; selectedSeat: Seat | null; onSelectSeat: (s: Seat) => void }) {
  const cols = 8;
  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(40px, 1fr))` }}>
        {coach.seats.map(seat => {
          const isSelected = selectedSeat?.id === seat.id;
          const isUnavailable = seat.isBooked || seat.isLocked;
          let cls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'; // Green
          if (isUnavailable) cls = 'bg-destructive/10 border-destructive/20 text-destructive/50 cursor-not-allowed'; // Red
          if (isSelected) cls = 'bg-accent border-accent text-accent-foreground shadow-sm scale-105'; // Blue

          return (
            <button
              key={seat.id}
              className={`flex h-10 w-full items-center justify-center rounded border text-xs font-mono font-semibold transition-all ${cls}`}
              onClick={() => !isUnavailable && onSelectSeat(seat)}
              disabled={isUnavailable}
              title={`Seat ${seat.number} - ${seat.position}${seat.isBooked ? ` (Booked)` : seat.isLocked ? ` (Locked by Route)` : ''}`}
            >
              {seat.number}
            </button>
          );
        })}
      </div>
    </div>
  );
}
