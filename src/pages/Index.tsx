import { useState, useCallback, useEffect } from 'react';
import { Train as TrainIcon, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Train } from '@/types/train';
import { useTrainContext } from '@/context/TrainContext';
import TrainSearch from '@/components/TrainSearch';
import TrainList from '@/components/TrainList';
import SeatMap from '@/components/SeatMap';
import { toast } from 'sonner';

type View = 'search' | 'seatmap';

const Index = () => {
  const { getTrainsByRoute, settings, trains, stations, bookings } = useTrainContext();
  const [view, setView] = useState<View>('search');
  const [results, setResults] = useState<Train[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [searchParams, setSearchParams] = useState({ origin: '', destination: '', date: '' });
  const [isSearching, setIsSearching] = useState(false);

  // Monitor database connection
  useEffect(() => {
    if (trains.length === 0 && stations.length === 0) {
      console.log('Context initialized, waiting for data...');
    } else {
      console.log(`Connected! Loaded ${trains.length} trains and ${stations.length} stations.`);
    }
  }, [trains, stations]);

  const handleSearch = (origin: string, destination: string, date: string) => {
    setSearchParams({ origin, destination, date });
    const filtered = getTrainsByRoute(origin, destination, date);
    setResults(filtered);
    if (filtered.length === 0) {
      toast.info('No trains found for this route and date.');
    }
  };

  const handleSelectTrain = (train: Train) => {
    setSelectedTrain(train);
    setView('seatmap');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent/30">
      {/* Header */}
      <header className="border-b border-border bg-primary/95 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-black text-primary-foreground tracking-tight leading-none">Epic Rails Of India</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 mt-1">Train Booking</p>
            </div>
          </div>
          <Link
            to="/admin"
            className="group flex items-center gap-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-2.5 text-sm font-bold text-primary-foreground/90 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all active:scale-95 shadow-sm"
          >
            <Shield className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        {view === 'search' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 text-center max-w-2xl mx-auto">
              <span
                className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest mb-4 border border-accent/20"
              >
                Welcome to BSCTC
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-tight">
                Your Next <span className="text-gradient">Journey</span> Starts Here
              </h2>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Connect to India's most advanced railway network. Pick your seat, get instant PNR, and travel in style.
              </p>
            </div>

            {!settings.bookingOpen ? (
              <div
                className="py-10 text-center bg-card border border-border border-dashed rounded-[2rem] shadow-sm overflow-hidden relative"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-destructive/20" />
                <h3 className="text-2xl font-black text-destructive mb-2">Reservations are Suspended</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">Our system is currently undergoing scheduled maintenance. Please check back shortly.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <TrainSearch onSearch={handleSearch} />

                {results.length > 0 && (
                  <div
                    className="space-y-6 pb-10"
                  >
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Available Routes</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <TrainList trains={results} onSelectTrain={handleSelectTrain} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'seatmap' && selectedTrain && (
          <div
            className="max-w-4xl mx-auto animate-in fade-in duration-500"
          >
            <SeatMap
              train={selectedTrain}
              journeyDate={searchParams.date}
              origin={searchParams.origin}
              destination={searchParams.destination}
              onBack={() => { setView('search'); setSelectedTrain(null); }}
            />
          </div>
        )}
      </main>

      {/* Footer Info - Now scrolls with the page */}
      <footer className="border-t border-border mt-auto pt-2 pb-1 w-full">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="text-left pb-1">
            <h4 className="text-lg font-bold text-foreground uppercase tracking-wider leading-none">Powered by Cloud</h4>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              EROI: The next generation of railway simulation and management.
            </p>
          </div>

          <div className="text-right pb-1">
            <p className="text-sm text-muted-foreground leading-tight italic font-medium max-w-md">
              This platform is a fictional simulation for the EROI game. <br className="hidden md:block" />
              Real-world ticket bookings are not facilitated here.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
