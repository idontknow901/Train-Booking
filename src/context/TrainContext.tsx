import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  getDoc, 
  getDocs,
  query,
  where,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { Train, Station, Booking, Seat, GlobalSettings, Coach } from '@/types/train';
import { toast } from 'sonner';

interface TrainContextType {
  trains: Train[];
  stations: Station[];
  bookings: Booking[];
  settings: GlobalSettings;
  addTrain: (train: Train) => Promise<void>;
  updateTrain: (train: Train) => Promise<void>;
  removeTrain: (id: string) => Promise<void>;
  addStation: (station: Station) => Promise<void>;
  removeStation: (code: string) => Promise<void>;
  bookSeat: (
    trainId: string, 
    coachId: string, 
    coachType: string, 
    origin: string, 
    destination: string, 
    journeyDate: string, 
    username: string, 
    selectedSeats: Seat[]
  ) => Promise<Booking | null>;
  cancelBooking: (pnr: string) => Promise<void>;
  resetAllSeats: () => Promise<void>;
  clearAllTrains: () => Promise<void>;
  updateSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
}

const TrainContext = createContext<TrainContextType | undefined>(undefined);

const withTimeout = (promise: Promise<any>, actionName: string, timeoutMs: number = 8000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${actionName} timed out after ${timeoutMs}ms`)), timeoutMs))
  ]);
};

export function TrainProvider({ children }: { children: React.ReactNode }) {
  const [trains, setTrains] = useState<Train[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({
    bookingOpen: true,
    lastBackup: new Date().toISOString()
  });

  useEffect(() => {
    const unsubTrains = onSnapshot(collection(db, 'trains'), (snapshot) => {
      setTrains(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Train)));
    });
    const unsubStations = onSnapshot(collection(db, 'stations'), (snapshot) => {
      setStations(snapshot.docs.map(doc => doc.data() as Station));
    });
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => doc.data() as Booking));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) setSettings(snapshot.data() as GlobalSettings);
    });

    return () => {
      unsubTrains();
      unsubStations();
      unsubBookings();
      unsubSettings();
    };
  }, []);

  const addTrain = useCallback(async (train: Train) => {
    await withTimeout(setDoc(doc(db, 'trains', train.id), train), 'Adding train');
  }, []);

  const updateTrain = useCallback(async (train: Train) => {
    await withTimeout(updateDoc(doc(db, 'trains', train.id), { ...train }), 'Updating train');
  }, []);

  const removeTrain = useCallback(async (id: string) => {
    await withTimeout(deleteDoc(doc(db, 'trains', id)), 'Removing train');
  }, []);

  const addStation = useCallback(async (station: Station) => {
    await withTimeout(setDoc(doc(db, 'stations', station.code), station), 'Adding station');
  }, []);

  const removeStation = useCallback(async (code: string) => {
    await withTimeout(deleteDoc(doc(db, 'stations', code)), 'Removing station');
  }, []);

  const bookSeat = useCallback(async (
    trainId: string,
    coachId: string,
    coachType: string,
    origin: string,
    destination: string,
    journeyDate: string,
    username: string,
    selectedSeats: Seat[]
  ) => {
    if (!settings.bookingOpen) {
      toast.error('Booking is currently closed for maintenance');
      return null;
    }

    try {
      const trainRef = doc(db, 'trains', trainId);
      const trainSnap = await getDoc(trainRef);

      if (trainSnap.exists()) {
        const trainData = trainSnap.data() as Train;
        const pnr = Math.random().toString().substring(2, 12);

        // Update the physical seats in the train document
        const updatedCoaches = trainData.coaches.map(coach => {
           if (coach.id === coachId) {
              const updatedSeats = coach.seats.map(seat => {
                 const isSelected = selectedSeats.some(s => s.id === seat.id);
                 if (isSelected) {
                    if (seat.isBooked) throw new Error(`Seat ${seat.number} was just booked by someone else.`);
                    return { ...seat, isBooked: true, bookedBy: username, pnr };
                 }
                 return seat;
              });
              return { ...coach, seats: updatedSeats };
           }
           return coach;
        });

        const originIdx = trainData.route.findIndex(s => s.code === origin);
        const destIdx = trainData.route.findIndex(s => s.code === destination);
        const routeStops = trainData.route.slice(originIdx, destIdx + 1).map(s => s.code);

        const newBooking: Booking = {
          pnr,
          username,
          trainId,
          trainName: trainData.name,
          trainNumber: trainData.number,
          coachId,
          coachType,
          seats: selectedSeats.map(s => ({
            number: s.number,
            position: s.position,
            coachId: coachId
          })),
          journeyDate,
          origin,
          destination,
          routeStops,
          bookedAt: new Date().toISOString(),
          status: 'CNF'
        };

        await withTimeout(updateDoc(trainRef, { coaches: updatedCoaches }), 'Updating train seats');
        await withTimeout(setDoc(doc(db, 'bookings', pnr), newBooking), 'Saving booking');

        // Send Discord Webhook notification
        try {
          const { sendBookingWebhook } = await import('@/lib/discord');
          sendBookingWebhook(newBooking, trainData);
        } catch (error) {
          console.error('Failed to trigger Discord webhook:', error);
        }

        return newBooking;
      }
    } catch (e: any) {
      console.error('bookSeat: ERROR', e);
      toast.error(e.message || 'Booking failed');
      throw e;
    }

    return null;
  }, [settings.bookingOpen]);

  const cancelBooking = useCallback(async (pnr: string) => {
    try {
      const booking = bookings.find(b => b.pnr === pnr);
      if (!booking) return;

      const trainRef = doc(db, 'trains', booking.trainId);
      const trainSnap = await getDoc(trainRef);

      if (trainSnap.exists()) {
        const trainData = trainSnap.data() as Train;
        const updatedCoaches = trainData.coaches.map(coach => {
          if (coach.id === booking.coachId) {
             const updatedSeats = coach.seats.map(seat => {
                if (seat.pnr === pnr) {
                   return { ...seat, isBooked: false, bookedBy: null, pnr: null };
                }
                return seat;
             });
             return { ...coach, seats: updatedSeats };
          }
          return coach;
        });
        await updateDoc(trainRef, { coaches: updatedCoaches });
      }

      await withTimeout(deleteDoc(doc(db, 'bookings', pnr)), 'Cancelling booking');
    } catch (e) {
      console.error('cancelBooking: ERROR', e);
    }
  }, [bookings]);

  const resetAllSeats = useCallback(async () => {
    try {
      const trainsQuery = await getDocs(collection(db, 'trains'));
      const batch = writeBatch(db);

      trainsQuery.docs.forEach(trainDoc => {
        const trainData = trainDoc.data() as Train;
        const resetCoaches = trainData.coaches.map(coach => ({
          ...coach,
          seats: coach.seats.map(seat => ({
            ...seat,
            isBooked: false,
            bookedBy: null,
            pnr: null,
          })),
        }));
        batch.update(trainDoc.ref, { coaches: resetCoaches });
      });

      const bookingsQuery = await getDocs(collection(db, 'bookings'));
      bookingsQuery.docs.forEach(bookingDoc => {
        batch.delete(bookingDoc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error resetting seats:', error);
    }
  }, []);

  const clearAllTrains = useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, 'trains'));
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<GlobalSettings>) => {
    await updateDoc(doc(db, 'settings', 'global'), newSettings);
  }, []);

  return (
    <TrainContext.Provider value={{
      trains,
      stations,
      bookings,
      settings,
      addTrain,
      updateTrain,
      removeTrain,
      addStation,
      removeStation,
      bookSeat,
      cancelBooking,
      resetAllSeats,
      clearAllTrains,
      updateSettings,
    }}>
      {children}
    </TrainContext.Provider>
  );
}

export function useTrainContext() {
  const context = useContext(TrainContext);
  if (context === undefined) {
    throw new Error('useTrainContext must be used within a TrainProvider');
  }
  return context;
}
