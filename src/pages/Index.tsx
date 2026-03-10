import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen bg-background selection:bg-accent/30">
      {/* Header */}
      <header className="border-b border-border bg-primary/95 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">

            <div>
              <h1 className="text-xl font-black text-primary-foreground tracking-tight leading-none">Booking</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 mt-1">Premium Rail Network</p>
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

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        {view === 'search' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-12 text-center max-w-2xl mx-auto">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest mb-4 border border-accent/20"
              >
                Seamless Travel Experience
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-tight">
                Your Next <span className="text-gradient">Journey</span> Starts Here
              </h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Connect to India's most advanced railway network. Pick your seat, get instant PNR, and travel in style.
              </p>
            </div>

            {!settings.bookingOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-16 text-center bg-card border border-border border-dashed rounded-[2rem] shadow-sm overflow-hidden relative"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-destructive/20" />
                <h3 className="text-3xl font-black text-destructive mb-3">Reservations are Suspended</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Our system is currently undergoing scheduled maintenance. Please check back shortly for availability.</p>
              </motion.div>
            ) : (
              <div className="space-y-12">
                <TrainSearch onSearch={handleSearch} />

                {results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Available Routes</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <TrainList trains={results} onSelectTrain={handleSelectTrain} />
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {view === 'seatmap' && selectedTrain && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-4xl mx-auto"
          >
            <SeatMap
              train={selectedTrain}
              journeyDate={searchParams.date}
              origin={searchParams.origin}
              destination={searchParams.destination}
              onBack={() => { setView('search'); setSelectedTrain(null); }}
            />
          </motion.div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-20 border-t border-border bg-card/50 py-12">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-sm font-bold text-foreground">Powered by Cloud</h4>
            <p className="text-xs text-muted-foreground mt-1">Real-time synchronization across all passenger terminals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
