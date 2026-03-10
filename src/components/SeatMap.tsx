import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, Coach, Seat } from '@/types/train';
import { useTrainContext } from '@/context/TrainContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Ticket, User } from 'lucide-react';
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
    if (!selectedSeat || !username.trim()) {
      toast.error('Please select a seat and enter your Roblox username');
      return;
    }
    if (!settings.bookingOpen) {
      toast.error('Booking is currently closed for maintenance');
      return;
    }

    setIsBooking(true);

    try {
      const booking = await bookSeat(train.id, selectedCoach, selectedSeat.id, username.trim(), journeyDate, origin, destination);
      if (booking) {
        toast.success(`Ticket booked! PNR: ${booking.pnr}`);
        setConfirmedBooking(booking);
        setSelectedSeat(null);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{train.name} <span className="font-mono text-accent">#{train.number}</span></h2>
          <p className="text-sm text-muted-foreground">{journeyDate}</p>
        </div>
      </div>

      {!settings.bookingOpen && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          ⚠ Booking is currently closed for maintenance
        </div>
      )}

      <Tabs value={selectedCoach} onValueChange={v => { setSelectedCoach(v); setSelectedSeat(null); }}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted p-1">
          {train.coaches.map(c => {
            const avail = c.seats.filter(s => !s.isBooked).length;
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

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border seat-available" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border seat-booked" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded border seat-selected" /> Selected</span>
      </div>

      <AnimatePresence>
        {selectedSeat && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-xl border border-accent/30 bg-accent/5 p-5"
          >
            <h3 className="mb-3 font-bold text-foreground flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" />
              Seat #{selectedSeat.number} — {selectedSeat.position}
            </h3>
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
                  <><Ticket className="mr-2 h-4 w-4" /> Generate Ticket</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SeatGrid({ coach, selectedSeat, onSelectSeat }: { coach: Coach; selectedSeat: Seat | null; onSelectSeat: (s: Seat) => void }) {
  const cols = 8;

  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(40px, 1fr))` }}>
        {coach.seats.map(seat => {
          const isSelected = selectedSeat?.id === seat.id;
          let cls = 'seat-available';
          if (seat.isBooked) cls = 'seat-booked';
          if (isSelected) cls = 'seat-selected';

          return (
            <motion.button
              key={seat.id}
              whileHover={!seat.isBooked ? { scale: 1.1 } : {}}
              whileTap={!seat.isBooked ? { scale: 0.95 } : {}}
              className={`flex h-10 w-full items-center justify-center rounded border text-xs font-mono font-semibold transition-colors ${cls}`}
              onClick={() => !seat.isBooked && onSelectSeat(seat)}
              disabled={seat.isBooked}
              title={`Seat ${seat.number} - ${seat.position}${seat.isBooked ? ` (Booked by ${seat.bookedBy})` : ''}`}
            >
              {seat.number}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
