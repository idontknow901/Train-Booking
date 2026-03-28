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

  const coach = train.coaches.find(c => c.id === selectedCoach) || train.coaches[0];

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
    const journeyDate = train.availableDate || new Date().toISOString().split('T')[0];
    return bookings.some(b => 
      b.trainId === train.id && 
      b.journeyDate === journeyDate && 
      b.seats.some(s => s.number === seat.number && s.coachId === coach.id)
    );
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
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    setIsBooking(true);
    try {
      const booking = await bookSeat(
        train.id,
        coach.id,
        coach.type,
        selectedOrigin,
        selectedDest,
        train.availableDate || new Date().toISOString().split('T')[0],
        username.trim(),
        selectedSeats
      );

      if (booking) {
        toast.success(`Successfully booked ${selectedSeats.length} seats!`);
        setSelectedSeats([]);
        setUsername('');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to book seats');
    } finally {
      setIsBooking(false);
    }
  };

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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-x-auto">
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

      {/* Fixed Non-Scrollable Booking Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-border animate-in slide-in-from-bottom-full duration-500">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="flex-1 w-full space-y-3">
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
                      className="pl-10 h-11 rounded-xl bg-background border-border"
                    />
                  </div>
                  <Button
                    onClick={handleBook}
                    disabled={isBooking || selectedSeats.length === 0}
                    className="h-11 px-8 font-black gap-2 w-full md:w-auto shadow-lg hover:scale-105 transition-all bg-[#1a365d] hover:bg-[#2c5282] rounded-xl"
                  >
                    {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                    BOOK {selectedSeats.length > 0 ? `${selectedSeats.length} SEATS` : 'NOW'}
                  </Button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeatMap;
