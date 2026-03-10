import { useState } from 'react';
import { Search, ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainContext } from '@/context/TrainContext';

interface TrainSearchProps {
  onSearch: (origin: string, destination: string, date: string) => void;
}

export default function TrainSearch({ onSearch }: TrainSearchProps) {
  const { stations } = useTrainContext();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');

  const handleSearch = () => {
    if (origin && destination && date && origin !== destination) {
      onSearch(origin, destination, date);
    }
  };

  return (
    <div
      className="rounded-xl border border-border bg-card p-6 shadow-lg"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <Search className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Search Trains</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Origin Station</label>
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger>
              <SelectValue placeholder="Select origin" />
            </SelectTrigger>
            <SelectContent>
              {stations.filter(s => s.code !== destination).map(s => (
                <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end justify-center">
          <ArrowRight className="mb-2 h-5 w-5 text-muted-foreground" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Destination Station</label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              {stations.filter(s => s.code !== origin).map(s => (
                <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Journey Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none ring-ring focus:ring-2"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSearch}
        disabled={!origin || !destination || !date || origin === destination}
        className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
      >
        <Search className="mr-2 h-4 w-4" /> Find Trains
      </Button>
    </div>
  );
}

