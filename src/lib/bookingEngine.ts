/**
 * Game Train Booking Engine
 * Core Systems Architecture for Segmented Routing and Faked Scarcity Simulation.
 * 
 * - SoftCap Logic: Restricts usable seats to a soft cap.
 * - Multi-Stop Segmented Routing: Allows a seat to be booked for multiple independent segments.
 * - RAC & Waitlist Queue: Manages passenger statuses beyond the soft cap and handles auto-promotions.
 */

export type BookingStatus = 'CNF' | 'RAC' | 'WL';

export interface PlayerBooking {
  playerId: string;       // Unique ID of the player
  startStation: string;
  endStation: string;
  startIndex: number;     // Route index for start station
  endIndex: number;       // Route index for end station
  status: BookingStatus;  // CNF, RAC, WL
  seatId: string | null;  // Seat assigned if CNF, otherwise null
  queueNumber: number;    // Queue position relative to the status (e.g. RAC 1, WL 5)
}

export interface GameSeat {
  id: string;
  // Tracks all bookings sitting in this seat
  // Bookings in the same seat must never have overlapping route segments
  bookings: PlayerBooking[];
}

export class GameTrainBookingSystem {
  route: string[];
  softCap: number;
  racCap: number;
  seats: GameSeat[];
  bookings: PlayerBooking[];

  /**
   * Initialize a new Booking Engine Simulation for a train routing.
   * 
   * @param route List of consecutive station codes (e.g., ['ST1', 'ST2', 'ST3', 'ST4'])
   * @param physicalSeatIds List of available seat IDs
   * @param softCap Maximum number of CNF seats allowed for booking (Faked Scarcity limit)
   * @param racCap Max limit up to which RAC is provided. Players beyond this get WL.
   */
  constructor(route: string[], physicalSeatIds: string[], softCap: number, racCap: number) {
    this.route = route;
    if (softCap > racCap) throw new Error("Soft Cap cannot be greater than RAC Cap");
    if (softCap > physicalSeatIds.length) throw new Error("Not enough physical seats to meet soft cap");

    this.softCap = softCap;
    this.racCap = racCap;
    
    // Initialize seats structure, we only allow access up to softCap to fake scarcity
    this.seats = physicalSeatIds.map(id => ({ id, bookings: [] }));
    this.bookings = [];
  }

  /**
   * Validates if a routing from generic B to C is possible along the station route track.
   */
  isValidRoute(startStation: string, endStation: string): { valid: boolean; startIndex: number; endIndex: number } {
    const startIndex = this.route.indexOf(startStation);
    const endIndex = this.route.indexOf(endStation);
    
    if (startIndex === -1 || endIndex === -1) {
      return { valid: false, startIndex: -1, endIndex: -1 };
    }
    
    // Start station must come before the End station in the route array
    if (startIndex >= endIndex) {
      return { valid: false, startIndex, endIndex };
    }
    
    return { valid: true, startIndex, endIndex };
  }

  /**
   * Determines if two booking segments overlap on the track.
   * [S1, E1) overlapping [S2, E2) implies they share track time.
   */
  static segmentsOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
    // Condition for overlap: max(start) < min(end)
    return Math.max(s1, s2) < Math.min(e1, e2);
  }

  /**
   * Finds an available physical seat for a segment, strictly respecting the Faked Scarcity Soft Cap.
   */
  findAvailableSeatForSegment(startIndex: number, endIndex: number): GameSeat | null {
    // We strictly limit our searching pool to the initial `softCap` amount of seats
    const manageableSeats = this.seats.slice(0, this.softCap);

    for (const seat of manageableSeats) {
        const isOccupied = seat.bookings.some(booking => 
            GameTrainBookingSystem.segmentsOverlap(startIndex, endIndex, booking.startIndex, booking.endIndex)
        );
        
        // If seat is clear for this segment interval, it's available
        if (!isOccupied) return seat;
    }
    return null;
  }

  /**
   * Primary API to process a booking request for a player.
   */
  bookTicket(playerId: string, startStation: string, endStation: string): PlayerBooking {
    const routeCheck = this.isValidRoute(startStation, endStation);
    if (!routeCheck.valid) {
      throw new Error(`Invalid route: Cannot travel from ${startStation} to ${endStation}. Check station sequence.`);
    }

    const { startIndex, endIndex } = routeCheck;
    
    // 1. Check for immediate Confirmed (CNF) seat via soft scarcity pool
    const availableSeat = this.findAvailableSeatForSegment(startIndex, endIndex);

    let newBooking: PlayerBooking;

    if (availableSeat) {
      // Create CNF booking
      newBooking = {
        playerId,
        startStation, endStation,
        startIndex, endIndex,
        status: 'CNF',
        seatId: availableSeat.id,
        queueNumber: 0 // Irrelevant for CNF, or could sequence by ticket print #
      };
      
      // Officially assign passenger to seat timeline
      availableSeat.bookings.push(newBooking);
      
    } else {
      // 2. No CNF seat available in this segment, evaluate RAC vs Waitlist (WL)
      // Cap sizes define system boundaries. 
      // Example: softCap=30, racCap=40. Therefore pool allows 10 RAC slots train-wide.
      const racAllowedSlots = this.racCap - this.softCap;
      const currentRacCount = this.bookings.filter(b => b.status === 'RAC').length;
      
      if (currentRacCount < racAllowedSlots) {
         // Create RAC booking
         newBooking = {
            playerId,
            startStation, endStation,
            startIndex, endIndex,
            status: 'RAC',
            seatId: null, // Sitting shared/no seat assigned yet
            queueNumber: currentRacCount + 1
         };
      } else {
         // Create Waitlist booking
         const currentWlCount = this.bookings.filter(b => b.status === 'WL').length;
         newBooking = {
            playerId,
            startStation, endStation,
            startIndex, endIndex,
            status: 'WL',
            seatId: null,
            queueNumber: currentWlCount + 1
         };
      }
    }
    
    this.bookings.push(newBooking);
    return newBooking;
  }
  
  /**
   * Cancels a booking when a player leaves the train/session.
   */
  cancelTicket(playerId: string) {
      const bIndex = this.bookings.findIndex(b => b.playerId === playerId);
      if (bIndex === -1) return; // Passenger not found
      
      const cancelledBooking = this.bookings[bIndex];
      // Discard booking
      this.bookings.splice(bIndex, 1);
      
      if (cancelledBooking.seatId) {
          // Vacate the seat's timeline
          const seat = this.seats.find(s => s.id === cancelledBooking.seatId);
          if (seat) {
              seat.bookings = seat.bookings.filter(b => b.playerId !== playerId);
          }
      }
      
      // Cascade promotions since capacity may have opened up
      this._processPromotions();
  }
  
  /**
   * Internal mechanism to automatically promote RAC -> CNF, and WL -> RAC
   */
  private _processPromotions() {
      // [1] Evaluate RAC bookings for CNF Promotion based on Queue Order
      const racBookings = this.bookings
        .filter(b => b.status === 'RAC')
        .sort((a, b) => a.queueNumber - b.queueNumber);
      
      for (const rac of racBookings) {
          const vacantSeat = this.findAvailableSeatForSegment(rac.startIndex, rac.endIndex);
          if (vacantSeat) {
              // Promote!
              rac.status = 'CNF';
              rac.seatId = vacantSeat.id;
              rac.queueNumber = 0;
              vacantSeat.bookings.push(rac);
          }
      }
      
      // [2] Evaluate WL bookings for RAC Promotion 
      const racAllowedSlots = this.racCap - this.softCap;
      const wlBookings = this.bookings
        .filter(b => b.status === 'WL')
        .sort((a, b) => a.queueNumber - b.queueNumber);
      
      for (const wl of wlBookings) {
          const currentRacCount = this.bookings.filter(b => b.status === 'RAC').length;
          
          if (currentRacCount < racAllowedSlots) {
              // Promote!
              wl.status = 'RAC';
          }
      }

      // [3] Re-index all sequence queues 
      // Re-index remaining RAC Queue numbers
      let racCounter = 1;
      for (const b of this.bookings) {
          if (b.status === 'RAC') {
              b.queueNumber = racCounter++;
          }
      }
      
      // Re-index remaining WL Queue numbers
      let wlCounter = 1;
      for (const b of this.bookings) {
          if (b.status === 'WL') {
              b.queueNumber = wlCounter++;
          }
      }
  }
  
  /**
   * Helper utility: See passenger manifest and their tracking details
   */
  getManifest(): PlayerBooking[] {
      return [...this.bookings];
  }
}
