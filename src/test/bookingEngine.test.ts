import { describe, it, expect, beforeEach } from 'vitest';
import { GameTrainBookingSystem } from '../lib/bookingEngine';

describe('GameTrainBookingSystem', () => {
  let engine: GameTrainBookingSystem;

  beforeEach(() => {
    // 4 physical seats, SoftCap = 2, RacCap = 4
    engine = new GameTrainBookingSystem(
      ['ST1', 'ST2', 'ST3', 'ST4'],
      ['SEAT_1', 'SEAT_2', 'SEAT_3', 'SEAT_4'],
      2,
      4
    );
  });

  it('validates forward and backward routing correctly', () => {
    const valid = engine.isValidRoute('ST1', 'ST3');
    expect(valid.valid).toBe(true);

    const invalid = engine.isValidRoute('ST3', 'ST1');
    expect(invalid.valid).toBe(false);

    const same = engine.isValidRoute('ST2', 'ST2');
    expect(same.valid).toBe(false);
  });

  it('allocates seats seamlessly across disjoint segments', () => {
    // Player 1 books ST1 to ST2 => Gets SEAT_1
    const p1 = engine.bookTicket('P1', 'ST1', 'ST2');
    expect(p1.status).toBe('CNF');
    expect(p1.seatId).toBe('SEAT_1');

    // Player 2 books ST2 to ST4 => Should get SEAT_1 because segment doesn't overlap
    const p2 = engine.bookTicket('P2', 'ST2', 'ST4');
    expect(p2.status).toBe('CNF');
    expect(p2.seatId).toBe('SEAT_1');
  });

  it('enforces soft cap scarcity despite having more physical seats', () => {
    // SoftCap is 2, so only 2 simultaneous players per segment should get CNF
    const p1 = engine.bookTicket('P1', 'ST1', 'ST4');
    expect(p1.status).toBe('CNF');

    const p2 = engine.bookTicket('P2', 'ST1', 'ST4');
    expect(p2.status).toBe('CNF');

    // 3rd player goes to RAC
    const p3 = engine.bookTicket('P3', 'ST1', 'ST4');
    expect(p3.status).toBe('RAC');
    expect(p3.queueNumber).toBe(1);

    // 4th player goes to RAC
    const p4 = engine.bookTicket('P4', 'ST1', 'ST4');
    expect(p4.status).toBe('RAC');
    expect(p4.queueNumber).toBe(2);

    // 5th player goes to Waitlist (RAC cap is 4: 4 - SoftCap(2) = 2 slots)
    const p5 = engine.bookTicket('P5', 'ST1', 'ST4');
    expect(p5.status).toBe('WL');
    expect(p5.queueNumber).toBe(1);
  });

  it('promotes RAC to CNF and WL to RAC when a confirmed passenger leaves', () => {
    // Setup full capacity + waitlist
    engine.bookTicket('P1', 'ST1', 'ST4'); // CNF
    engine.bookTicket('P2', 'ST1', 'ST4'); // CNF
    const rac1 = engine.bookTicket('P3', 'ST1', 'ST4'); // RAC 1
    const rac2 = engine.bookTicket('P4', 'ST1', 'ST4'); // RAC 2
    const wl1 = engine.bookTicket('P5', 'ST1', 'ST4');  // WL 1

    expect(rac1.status).toBe('RAC');
    
    // P1 leaves
    engine.cancelTicket('P1');

    // RAC1 (P3) should be promoted to CNF
    expect(rac1.status).toBe('CNF');
    expect(rac1.seatId).toBe('SEAT_1'); // Should inherit P1's vacated seat
    expect(rac1.queueNumber).toBe(0);

    // RAC2 (P4) should move up to RAC 1
    expect(rac2.status).toBe('RAC');
    expect(rac2.queueNumber).toBe(1);

    // WL1 (P5) should promote to RAC 2 slot
    expect(wl1.status).toBe('RAC');
    expect(wl1.queueNumber).toBe(2);
  });
});
