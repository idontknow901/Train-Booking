import { motion } from 'framer-motion';
import { Clock, ArrowRight, Train as TrainIcon } from 'lucide-react';
import { Train } from '@/types/train';
import { Button } from '@/components/ui/button';

interface TrainListProps {
  trains: Train[];
  onSelectTrain: (train: Train) => void;
}

export default function TrainList({ trains, onSelectTrain }: TrainListProps) {
  if (trains.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-xl border border-border bg-card p-8 text-center">
        <TrainIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">No trains found for this route</p>
      </motion.div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {trains.map((train, i) => {
        const totalSeats = train.coaches.reduce((a, c) => a + c.totalSeats, 0);
        const bookedSeats = train.coaches.reduce((a, c) => a + c.seats.filter(s => s.isBooked).length, 0);
        const available = totalSeats - bookedSeats;

        return (
          <motion.div
            key={train.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold text-accent">#{train.number}</span>
                  <h3 className="text-lg font-bold text-foreground">{train.name}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>{train.route[0].name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{train.route[train.route.length - 1].name}</span>
                  </div>
                  {train.availableDate && (
                    <div className="flex items-center gap-1 border-l border-border pl-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent/70">Scheduled for</span>
                      <span className="font-semibold text-foreground">{train.availableDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" /> Dep
                  </div>
                  <span className="font-mono text-lg font-bold text-foreground">{train.departureTime}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-center">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" /> Arr
                  </div>
                  <span className="font-mono text-lg font-bold text-foreground">{train.arrivalTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={`font-mono text-2xl font-bold ${available > 0 ? 'text-success' : 'text-destructive'}`}>
                    {available}
                  </span>
                  <p className="text-xs text-muted-foreground">seats left</p>
                </div>
                <Button
                  onClick={() => onSelectTrain(train)}
                  disabled={available === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Select
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
