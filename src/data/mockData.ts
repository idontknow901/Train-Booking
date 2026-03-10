import { Station, Train, Seat } from '@/types/train';

export const STATIONS: Station[] = [
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'MUM', name: 'Mumbai Central' },
  { code: 'HWH', name: 'Howrah Junction' },
  { code: 'MAS', name: 'Chennai Central' },
  { code: 'BLR', name: 'Bangalore City' },
  { code: 'JP', name: 'Jaipur Junction' },
  { code: 'LKO', name: 'Lucknow' },
  { code: 'ADI', name: 'Ahmedabad Junction' },
];

const POSITIONS: Seat['position'][] = ['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper', 'Lower', 'Middle', 'Upper'];

function generateSeats(count: number): Seat[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `seat-${i + 1}`,
    number: i + 1,
    position: POSITIONS[i % POSITIONS.length],
    isBooked: false,
  }));
}

export const INITIAL_TRAINS: Train[] = [
  {
    id: 'train-1',
    name: 'Rajdhani Express',
    number: '12301',
    route: [
      { code: 'NDLS', name: 'New Delhi' },
      { code: 'MUM', name: 'Mumbai Central' },
    ],
    departureTime: '16:55',
    arrivalTime: '08:35',
    coaches: [
      { id: 'SL-1', type: 'SL', totalSeats: 72, seats: generateSeats(72) },
      { id: '3A-1', type: '3A', totalSeats: 64, seats: generateSeats(64) },
      { id: '2A-1', type: '2A', totalSeats: 48, seats: generateSeats(48) },
    ],
  },
  {
    id: 'train-2',
    name: 'Shatabdi Express',
    number: '12002',
    route: [
      { code: 'NDLS', name: 'New Delhi' },
      { code: 'JP', name: 'Jaipur Junction' },
    ],
    departureTime: '06:05',
    arrivalTime: '10:30',
    coaches: [
      { id: 'SL-2', type: 'SL', totalSeats: 72, seats: generateSeats(72) },
      { id: '3A-2', type: '3A', totalSeats: 64, seats: generateSeats(64) },
    ],
  },
  {
    id: 'train-3',
    name: 'Duronto Express',
    number: '12213',
    route: [
      { code: 'MUM', name: 'Mumbai Central' },
      { code: 'BLR', name: 'Bangalore City' },
    ],
    departureTime: '20:10',
    arrivalTime: '06:45',
    coaches: [
      { id: 'SL-3', type: 'SL', totalSeats: 72, seats: generateSeats(72) },
      { id: '3A-3', type: '3A', totalSeats: 64, seats: generateSeats(64) },
      { id: '2A-3', type: '2A', totalSeats: 48, seats: generateSeats(48) },
      { id: '1A-3', type: '1A', totalSeats: 24, seats: generateSeats(24) },
    ],
  },
  {
    id: 'train-4',
    name: 'Garib Rath Express',
    number: '12909',
    route: [
      { code: 'HWH', name: 'Howrah Junction' },
      { code: 'NDLS', name: 'New Delhi' },
    ],
    departureTime: '14:20',
    arrivalTime: '04:55',
    coaches: [
      { id: 'SL-4', type: 'SL', totalSeats: 72, seats: generateSeats(72) },
      { id: '3A-4', type: '3A', totalSeats: 64, seats: generateSeats(64) },
    ],
  },
];
