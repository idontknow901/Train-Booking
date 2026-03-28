export interface Station {
  code: string;
  name: string;
}

export interface Train {
  id: string;
  name: string;
  number: string;
  route: Station[];
  departureTime: string;
  arrivalTime: string;
  coaches: Coach[];
  availableDate?: string;
  maxConfirmedSeats?: number;
  racLimit?: number;
}

export interface Coach {
  id: string;
  type: 'SL' | '3A' | '2A' | '1A';
  totalSeats: number;
  maxConfirmed: number;
  seats: Seat[];
}

export interface Seat {
  id: string;
  number: number;
  position: 'Lower' | 'Middle' | 'Upper' | 'Side Lower' | 'Side Upper';
  isBooked: boolean;
  isLocked?: boolean;
  bookedBy?: string;
  pnr?: string;
}

export interface Booking {
  pnr: string;
  username: string;
  trainId: string;
  trainName: string;
  trainNumber: string;
  coachId: string;
  coachType: string;
  seatNumber: number;
  seatPosition: string;
  journeyDate: string;
  origin: string;
  destination: string;
  routeStops?: string[];
  bookedAt: string;
  status?: string; // Legacy field for single-status checks if needed
  initialStatus: string;  // Status at purchase (e.g. WL 5)
  currentStatus: string;  // Dynamic status (e.g. CNF)
  queueNumber: number;
}

export interface GlobalSettings {
  bookingOpen: boolean;
}
