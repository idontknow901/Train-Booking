import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Train, Booking, GlobalSettings, Station } from '@/types/train';

interface TrainContextType {
  trains: Train[];
  bookings: Booking[];
  settings: GlobalSettings;
  stations: Station[];
  addTrain: (train: Train) => Promise<void>;
  removeTrain: (trainId: string) => Promise<void>;
  bookSeat: (trainId: string, coachId: string, seatId: string, username: string, journeyDate: string, origin: string, destination: string) => Promise<Booking | null>;
  resetAllSeats: () => Promise<void>;
  toggleBooking: () => Promise<void>;
  getTrainsByRoute: (origin: string, destination: string, date?: string) => Train[];
  addStation: (station: Station) => Promise<void>;
  removeStation: (code: string) => Promise<void>;
  clearAllTrains: () => Promise<void>;
  clearAllStations: () => Promise<void>;
  clearAllBookings: () => Promise<void>;
}

const TrainContext = createContext<TrainContextType | null>(null);

const TIMEOUT_MS = 30000;

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`System Timeout: ${message} (Check Vercel Config)`)), TIMEOUT_MS)
  );
  return Promise.race([promise, timeout]);
}

function generatePNR(existingBookings: Booking[]): string {
  let pnr: string;
  let isDuplicate: boolean;

  do {
    pnr = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    isDuplicate = existingBookings.some(b => b.pnr === pnr);
  } while (isDuplicate);

  return pnr;
}

export function TrainProvider({ children }: { children: React.ReactNode }) {
  const [trains, setTrains] = useState<Train[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ bookingOpen: true });

  // Sync Trains
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'trains'),
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Train));
        console.log(`Trains updated (fromCache: ${fromCache}, count: ${data.length})`);
        setTrains(data);
      },
      (error) => console.error("Trains sync error:", error)
    );
    return unsub;
  }, []);

  // Sync Bookings
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Booking);
        console.log("Bookings updated:", data.length);
        setBookings(data);
      },
      (error) => console.error("Bookings sync error:", error)
    );
    return unsub;
  }, []);

  // Sync Stations
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stations'),
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        const data = snapshot.docs.map(doc => doc.data() as Station);
        console.log(`Stations updated (fromCache: ${fromCache}, count: ${data.length})`);
        setStations(data);
      },
      (error) => console.error("Stations sync error:", error)
    );
    return unsub;
  }, []);

  // Sync Settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as GlobalSettings);
      } else {
        // Initialize settings if they don't exist
        setDoc(doc(db, 'settings', 'global'), { bookingOpen: true });
      }
    });
    return unsub;
  }, []);

  const addTrain = useCallback(async (train: Train) => {
    console.log('addTrain: Attempting write...', train.id);
    try {
      await withTimeout(setDoc(doc(db, 'trains', train.id), train), 'Adding train');
      console.log('addTrain: SUCCESS');
    } catch (e: any) {
      const errCode = e.code ? `(${e.code})` : '';
      console.error('addTrain: ERROR', e);
      throw new Error(`Failed to add train ${errCode}: ${e.message}`);
    }
  }, []);

  const removeTrain = useCallback(async (trainId: string) => {
    await withTimeout(deleteDoc(doc(db, 'trains', trainId)), 'Removing train');
  }, []);

  const addStation = useCallback(async (station: Station) => {
    console.log('addStation: Attempting write...', station.code);
    try {
      await withTimeout(setDoc(doc(db, 'stations', station.code), station), 'Adding station');
      console.log('addStation: SUCCESS');
    } catch (e: any) {
      const errCode = e.code ? `(${e.code})` : '';
      console.error('addStation: ERROR', e);
      throw new Error(`Failed to add station ${errCode}: ${e.message}`);
    }
  }, []);

  const removeStation = useCallback(async (code: string) => {
    await withTimeout(deleteDoc(doc(db, 'stations', code)), 'Removing station');
  }, []);

  const bookSeat = useCallback(async (trainId: string, coachId: string, seatId: string, username: string, journeyDate: string, origin: string, destination: string): Promise<Booking | null> => {
    if (!settings.bookingOpen) return null;

    try {
      const trainRef = doc(db, 'trains', trainId);
      const pnr = generatePNR(bookings);
      let booking: Booking | null = null;

      // We need to fetch current train data to update the seat
      // Note: In production, use runTransaction for atomicity
      const trainSnap = await withTimeout(getDoc(trainRef), 'Fetching train for booking');

      if (trainSnap.exists()) {
        const trainData = trainSnap.data() as Train;
        const updatedCoaches = trainData.coaches.map(coach => {
          if (coach.id !== coachId) return coach;
          return {
            ...coach,
            seats: coach.seats.map(seat => {
              if (seat.id !== seatId || seat.isBooked) return seat;
              booking = {
                pnr,
                username,
                trainId,
                trainName: trainData.name,
                trainNumber: trainData.number,
                coachId: coach.id,
                seatNumber: seat.number,
                seatPosition: seat.position,
                journeyDate,
                origin,
                destination,
                bookedAt: new Date().toISOString(),
              };
              return { ...seat, isBooked: true, bookedBy: username, pnr };
            }),
          };
        });

        if (booking) {
          await withTimeout(updateDoc(trainRef, { coaches: updatedCoaches }), 'Updating train seats');
          await withTimeout(setDoc(doc(db, 'bookings', pnr), booking), 'Saving booking');
          return booking;
        }
      }
    } catch (e: any) {
      const errCode = e.code ? `(${e.code})` : '';
      console.error('bookSeat: ERROR', e);
      throw new Error(`Booking failed ${errCode}: ${e.message}`);
    }

    return null;
  }, [settings.bookingOpen, bookings]);

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
      console.log('Successfully reset all seats and bookings');
    } catch (error) {
      console.error('Error resetting seats:', error);
      throw error;
    }
  }, []);

  const clearAllTrains = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'trains'));
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) { console.error(e); throw e; }
  }, []);

  const clearAllStations = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'stations'));
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) { console.error(e); throw e; }
  }, []);

  const clearAllBookings = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) { console.error(e); throw e; }
  }, []);

  const toggleBooking = useCallback(async () => {
    await withTimeout(updateDoc(doc(db, 'settings', 'global'), { bookingOpen: !settings.bookingOpen }), 'Toggling reservations');
  }, [settings.bookingOpen]);

  const getTrainsByRoute = useCallback((origin: string, destination: string, date?: string) => {
    return trains.filter(train => {
      const routeCodes = train.route.map(s => s.code);
      const onRoute = routeCodes.includes(origin) && routeCodes.includes(destination);
      if (!onRoute) return false;

      if (date && train.availableDate) {
        // Simple string comparison for dates (expected as YYYY-MM-DD or similar)
        return train.availableDate === date;
      }
      return true;
    });
  }, [trains]);

  return (
    <TrainContext.Provider value={{
      trains, bookings, settings, stations,
      addTrain, removeTrain, bookSeat, resetAllSeats,
      toggleBooking, getTrainsByRoute, addStation, removeStation,
      clearAllTrains, clearAllStations, clearAllBookings
    }}>
      {children}
    </TrainContext.Provider>
  );
}

export function useTrainContext() {
  const ctx = useContext(TrainContext);
  if (!ctx) throw new Error('useTrainContext must be used within TrainProvider');
  return ctx;
}

