import { Booking } from '@/types/train';

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

export async function sendBookingWebhook(booking: Booking) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not found in environment variables');
    return;
  }

  const embed = {
    title: '🚂 New Train Booking Confirmed!',
    color: 0x3b82f6, // Blue color
    fields: [
      {
        name: '👤 Passenger',
        value: `\`${booking.username}\``,
        inline: true,
      },
      {
        name: '🎫 PNR Number',
        value: `\`${booking.pnr}\``,
        inline: true,
      },
      {
        name: '🚆 Train Details',
        value: `${booking.trainName} (#${booking.trainNumber})`,
        inline: false,
      },
      {
        name: '📍 Route',
        value: `${booking.origin} → ${booking.destination}`,
        inline: false,
      },
      {
        name: '💺 Seat Info',
        value: `Coach: ${booking.coachId.split('-')[0]} | Seat: ${booking.seatNumber} (${booking.seatPosition})`,
        inline: true,
      },
      {
        name: '📅 Journey Date',
        value: booking.journeyDate,
        inline: true,
      },
      {
        name: '⏰ Booked At',
        value: new Date(booking.bookedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        inline: false,
      },
    ],
    footer: {
      text: 'Epic Rails Of India • Train Booking System',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Discord webhook:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
  }
}
