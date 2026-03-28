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
  seatNumber: number;
  seatPosition: string;
  journeyDate: string;
  origin: string;
  destination: string;
  bookedAt: string;
  status?: string;
  queueNumber?: number;
}

export interface GlobalSettings {
  bookingOpen: boolean;
}
