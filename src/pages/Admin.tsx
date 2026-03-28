import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Train as TrainIcon, Users, RotateCcw, Plus, ArrowLeft, Power, BarChart3, MapPin, Trash2, Calendar } from 'lucide-react';
import { useTrainContext } from '@/context/TrainContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AdminLogin from '@/components/AdminLogin';
import { Train, Coach, Station, Booking, Seat } from '@/types/train';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });

  const {
    trains, bookings, settings, stations,
    toggleBooking, resetAllSeats, addTrain, removeTrain,
    addStation, removeStation, clearAllTrains, clearAllStations, clearAllBookings
  } = useTrainContext();

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('admin_auth', 'true');
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const totalSeats = trains.reduce((a, t) => a + t.coaches.reduce((b, c) => b + c.totalSeats, 0), 0);
  const bookedSeats = trains.reduce((a, t) => a + t.coaches.reduce((b, c) => b + c.seats.filter(s => s.isBooked).length, 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-8">

        {/* Stats */}
        <div className="mb-8 grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Total Trains', value: trains.length, icon: TrainIcon, color: 'text-accent', bg: 'bg-accent/10' },
            { label: 'Total Seats', value: totalSeats, icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Booked', value: bookedSeats, icon: Users, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Available', value: totalSeats - bookedSeats, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`mt-3 font-mono text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Global Controls */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
            <Power className={`h-5 w-5 ${settings.bookingOpen ? 'text-emerald-500' : 'text-destructive'}`} />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Status</span>
              <span className="text-sm font-bold text-foreground">Reservations</span>
            </div>
            <Switch
              checked={settings.bookingOpen}
              onCheckedChange={async () => {
                try {
                  await toggleBooking();
                  toast.success(`Reservations are now ${!settings.bookingOpen ? 'OPEN' : 'CLOSED'}`);
                } catch (e) {
                  toast.error('Failed to update settings');
                }
              }}
            />
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${settings.bookingOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
              {settings.bookingOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <Button
            variant="destructive"
            size="lg"
            className="rounded-2xl font-bold shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-95"
            onClick={async () => {
              if (!confirm('This will RESET all seats on all trains and DELETE all booking records. Continue?')) return;
              try {
                await resetAllSeats();
                toast.success('All seats have been reset');
              } catch (e) {
                toast.error('Reset failed. Check console.');
              }
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset All Seats
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-2xl font-bold border-destructive/30 text-destructive hover:bg-destructive/10 transition-all active:scale-95"
            onClick={async () => {
              if (!confirm('CRITICAL: This will DELETE EVERYTHING (Trains, Stations, Bookings). Are you absolutely sure?')) return;
              try {
                await clearAllBookings();
                await clearAllTrains();
                await clearAllStations();
                toast.success('System wiped successfully');
              } catch (e) {
                toast.error('Global Reset failed');
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Global Wipe
          </Button>
        </div>

        <Tabs defaultValue="passengers" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl w-full md:w-auto h-auto grid grid-cols-2 md:flex">
            <TabsTrigger value="passengers" className="rounded-lg py-2 px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Passengers</TabsTrigger>
            <TabsTrigger value="trains" className="rounded-lg py-2 px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Trains</TabsTrigger>
            <TabsTrigger value="stations" className="rounded-lg py-2 px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Stations</TabsTrigger>
          </TabsList>

          <TabsContent value="passengers" className="focus-visible:outline-none">
            <PassengerList bookings={bookings} onClearAll={clearAllBookings} />
          </TabsContent>

          <TabsContent value="trains" className="focus-visible:outline-none space-y-6">
            <div className="grid lg:grid-cols-[1fr,400px] gap-6 items-start">
              <TrainList trains={trains} onRemove={removeTrain} onClearAll={clearAllTrains} />
              <AddTrainForm onAdd={addTrain} stations={stations} />
            </div>
          </TabsContent>

          <TabsContent value="stations" className="focus-visible:outline-none">
            <StationManager stations={stations} onAdd={addStation} onRemove={removeStation} onClearAll={clearAllStations} />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}

function PassengerList({ bookings, onClearAll }: { bookings: Booking[], onClearAll: () => Promise<void> }) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
        <h3 className="text-lg font-bold text-foreground">No bookings recorded</h3>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm mt-1">Passenger information will appear here once reservations are made.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" /> Active Passengers
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!confirm('Clear all booking records?')) return;
            try {
              await onClearAll();
              toast.success('Bookings cleared');
            } catch (e) {
              toast.error('Failed to clear bookings');
            }
          }}
          className="text-destructive hover:bg-destructive/10 font-bold"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Clear All Records
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['PNR', 'Username', 'Train', 'Coach/Seat', 'Route', 'Date'].map(h => (
                  <th key={h} className="px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...bookings].sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()).map(b => (
                <tr key={b.pnr} className="hover:bg-muted/30 transition-colors">

                  <td className="px-6 py-4 font-mono font-bold text-accent">{b.pnr}</td>
                  <td className="px-6 py-4 font-bold text-foreground">{b.username}</td>
                  <td className="px-6 py-4 text-foreground">{b.trainName} <span className="text-[10px] opacity-50 ml-1">#{b.trainNumber}</span></td>
                  <td className="px-6 py-4 font-mono text-foreground text-xs">
                    {b.coachId?.split('-')[0]} / {b.seats ? b.seats.map(s => `#${s.number}`).join(', ') : `#${(b as any).seatNumber || 'N/A'}`}
                  </td>
                  <td className="px-6 py-4 text-foreground font-medium">{b.origin} → {b.destination}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{b.journeyDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrainList({ trains, onRemove, onClearAll }: { trains: Train[], onRemove: (id: string) => Promise<void>, onClearAll: () => Promise<void> }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <TrainIcon className="h-5 w-5 text-accent" /> Active Trains
        </h3>
        {trains.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!confirm('Remove all trains from the database?')) return;
              try {
                await onClearAll();
                toast.success('All trains removed');
              } catch (e) {
                toast.error('Failed to remove trains');
              }
            }}
            className="text-destructive hover:bg-destructive/10 font-bold"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Wipe All Trains
          </Button>
        )}
      </div>
      {trains.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
          <p className="text-muted-foreground text-sm">No trains configured</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {trains.map(train => (
            <div key={train.id} className="group flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-accent/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <TrainIcon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-none">{train.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tight">
                    {train.number} • {train.route[0]?.code} → {train.route[1]?.code}
                    {train.availableDate && ` • ${train.availableDate}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await onRemove(train.id);
                    toast.success(`${train.name} removed`);
                  } catch (e) {
                    toast.error(`Failed to remove ${train.name}`);
                  }
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddTrainForm({ onAdd, stations }: { onAdd: (train: Train) => Promise<void>, stations: Station[] }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [maxConfirmed, setMaxConfirmed] = useState(10);
  const [racLimit, setRacLimit] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coaches, setCoaches] = useState<{ type: Coach['type']; seats: number; maxConfirmed: number }[]>([{ type: 'SL', seats: 72, maxConfirmed: 25 }]);

  const handleSubmit = async () => {
    if (!name || !number || !origin || !destination || origin === destination) {
      toast.error('Please fill all fields correctly');
      return;
    }

    const originStation = stations.find(s => s.code === origin)!;
    const destStation = stations.find(s => s.code === destination)!;
    const mappedStops = intermediateStops.map(code => stations.find(s => s.code === code)).filter(Boolean) as Station[];

    setIsSubmitting(true);

    const train: Train = {
      id: `train-${Date.now()}`,
      name,
      number,
      route: [originStation, ...mappedStops, destStation],
      departureTime: '00:00',
      arrivalTime: '00:00',
      availableDate: date || undefined,
      maxConfirmedSeats: maxConfirmed,
      racLimit: racLimit,
      coaches: coaches.map((c, i) => {
        // Feature 1: Randomized Visual Scarcity 
        // We pick exactly maxConfirmed number of indices to stay unlocked. The rest is locked (Red).
        const unlockedIndices = new Set();

        // Randomly pick unique indices to unlock
        while (unlockedIndices.size < Math.min(c.maxConfirmed, c.seats)) {
          const rand = Math.floor(Math.random() * c.seats);
          unlockedIndices.add(rand);
        }

        return {
          id: `${c.type}-${Date.now()}-${i}`,
          type: c.type,
          totalSeats: c.seats,
          maxConfirmed: c.maxConfirmed,
          seats: Array.from({ length: c.seats }, (_, j) => {
            let position: Seat['position'] = 'Lower';
            const seatNum = j + 1;

            if (c.type === 'SL' || c.type === '3A') {
              const mod = seatNum % 8;
              if (mod === 1 || mod === 4) position = 'Lower';
              else if (mod === 2 || mod === 5) position = 'Middle';
              else if (mod === 3 || mod === 6) position = 'Upper';
              else if (mod === 7) position = 'Side Lower';
              else position = 'Side Upper'; // mod === 0
            } else if (c.type === '2A') {
              const mod = seatNum % 6;
              if (mod === 1 || mod === 3) position = 'Lower';
              else if (mod === 2 || mod === 4) position = 'Upper';
              else if (mod === 5) position = 'Side Lower';
              else position = 'Side Upper'; // mod === 0
            } else if (c.type === '1A') {
              const mod = seatNum % 4;
              if (mod === 1 || mod === 3) position = 'Lower';
              else position = 'Upper'; // mod 2, 0
            }

            return {
              id: `seat-${seatNum}`,
              number: seatNum,
              position,
              isBooked: false,
              isLocked: !unlockedIndices.has(j)
            };
          }),
        };
      }),
    };

    try {
      // Reset form immediately
      setName('');
      setNumber('');
      setOrigin('');
      setDestination('');
      setIntermediateStops([]);
      setDate('');
      setCoaches([{ type: 'SL', seats: 72, maxConfirmed: 25 }]);

      await onAdd(train);
      toast.success(`Train "${train.name}" added!`);
    } catch (e) {
      console.error('Failed to add train:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to add train.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sticky top-24">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
        <Plus className="h-5 w-5 text-accent" /> Add New Train
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Train Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Vande Bharat" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Number</label>
            <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="22436" className="rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Origin</label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {stations.map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Destination</label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {stations.filter(s => s.code !== origin).map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Confirmed Seats Cap</label>
            <Input type="number" value={maxConfirmed} onChange={e => setMaxConfirmed(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">RAC Limit</label>
            <Input type="number" value={racLimit} onChange={e => setRacLimit(Number(e.target.value))} className="rounded-xl" />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Intermediate Stops (Multi-Route)</label>
          <div className="space-y-2">
            {intermediateStops.map((stopCode, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select value={stopCode} onValueChange={(v) => {
                  const n = [...intermediateStops];
                  n[idx] = v;
                  setIntermediateStops(n);
                }}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Intermediate Station" /></SelectTrigger>
                  <SelectContent>
                    {stations.filter(s => s.code !== origin && s.code !== destination).map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setIntermediateStops(intermediateStops.filter((_, i) => i !== idx))} className="h-9 w-9 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setIntermediateStops([...intermediateStops, ''])} className="w-full rounded-xl border-dashed">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Stop
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Available Date (Optional)
          </label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
        </div>

        <div className="space-y-3 pt-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Coach Configuration</label>
          <div className="space-y-2">
            {coaches.map((c, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <Select value={c.type} onValueChange={v => {
                  const updated = [...coaches];
                  updated[i].type = v as Coach['type'];
                  setCoaches(updated);
                }}>
                  <SelectTrigger className="w-20 h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['SL', '3A', '2A', '1A'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative w-28">
                  <Input type="number" value={c.seats} onChange={e => {
                    const updated = [...coaches];
                    updated[i].seats = Math.max(1, Math.min(200, parseInt(e.target.value) || 1));
                    setCoaches(updated);
                  }} className="h-9 rounded-lg text-xs" min={1} max={200} title="Total Physical Seats" />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold" title="Physical Total">TOT</span>
                </div>
                <div className="relative w-32 border-l pl-2">
                  <Input type="number" value={c.maxConfirmed} onChange={e => {
                    const updated = [...coaches];
                    updated[i].maxConfirmed = Math.max(1, Math.min(updated[i].seats, parseInt(e.target.value) || 1));
                    setCoaches(updated);
                  }} className="h-9 rounded-lg text-xs border-emerald-500/50" min={1} max={200} title="Max Confirmed (Green Seats)" />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-bold" title="Green Slots Limit">CNF</span>
                </div>
                {coaches.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setCoaches(coaches.filter((_, j) => j !== i))} className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCoaches([...coaches, { type: 'SL', seats: 72, maxConfirmed: 25 }])} className="w-full rounded-xl border-dashed py-5 border-2 hover:border-accent/50 hover:bg-accent/5 transition-all text-xs font-bold uppercase tracking-wider">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add CoachType
            </Button>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full mt-4 h-11 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98]">
          <Plus className="mr-2 h-4 w-4" /> Add Train to Registry
        </Button>
      </div>
    </div>
  );
}

function StationManager({ stations, onAdd, onRemove, onClearAll }: { stations: Station[], onAdd: (s: Station) => Promise<void>, onRemove: (code: string) => Promise<void>, onClearAll: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name || !code) {
      toast.error('Please enter both station name and code');
      return;
    }
    setIsSubmitting(true);
    try {
      const station = { name, code: code.toUpperCase() };

      // Reset fields immediately so user can add another station without waiting
      setName('');
      setCode('');

      await onAdd(station);
      toast.success(`Station "${station.name}" added!`);
    } catch (e) {
      console.error('Failed to add station:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to add station.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-[1fr,350px] gap-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" /> Active Stations
          </h3>
          {stations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!confirm('Delete all stations? This may break existing train routes.')) return;
                try {
                  await onClearAll();
                  toast.success('All stations cleared');
                } catch (e) {
                  toast.error('Failed to clear stations');
                }
              }}
              className="text-destructive hover:bg-destructive/10 font-bold"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear All Stations
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.map(s => (
            <div key={s.code} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm group hover:border-accent/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center font-mono font-bold text-accent text-xs">
                  {s.code}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{s.name}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{s.code}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await onRemove(s.code);
                    toast.success(`${s.name} removed`);
                  } catch (e) {
                    toast.error(`Failed to remove ${s.name}`);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-fit space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" /> Add Station
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Station Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kolkata Junction" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Station Code</label>
            <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. KOAA" maxLength={5} className="rounded-xl font-mono uppercase" disabled={isSubmitting} />
          </div>
          <Button onClick={handleAdd} disabled={isSubmitting || !name || !code} className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98]">
            {isSubmitting ? 'Creating...' : 'Create Station'}
          </Button>
        </div>

      </div>
    </div>
  );
}
