import { useState } from 'react';
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

  // physical seat selection removed for engine auto-allocation
  const [username, setUsername] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBooking, setIsBooking] = useState(false);

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
      const booking = await bookSeat(train.id, null, null, username.trim(), journeyDate, origin, destination);
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

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
        <h3 className="mb-3 font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-5 w-5 text-accent" />
          Request Train Ticket
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter your Roblox username to be assigned a ticket. The game system will allocate a Confirmed Seat (CNF), Reservation Against Cancellation (RAC), or Waitlist (WL) based on live segmented train capacity.
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
              <><Ticket className="mr-2 h-4 w-4" /> Generate Ticket</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
