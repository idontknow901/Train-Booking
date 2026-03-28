import { Booking } from '@/types/train';

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

export async function sendBookingWebhook(booking: Booking) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not found in environment variables');
    return;
  }

  const titleSuffix = booking.status === 'CNF' ? 'Confirmed' : booking.status === 'RAC' ? 'RAC Assigned' : 'Waitlisted';
  const color = booking.status === 'CNF' ? 0x10b981 : booking.status === 'RAC' ? 0xf59e0b : 0xef4444; // Green, Yellow, Red

  const embed = {
    title: `🚂 New Train Booking ${titleSuffix}!`,
    color: color,
    fields: [
      {
        name: '🚥 Status',
        value: `**${booking.status === 'CNF' ? 'Confirmed (CNF)' : `${booking.status} / W/L ${booking.queueNumber}`}**`,
        inline: false,
      },
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
        value: booking.status === 'WL' ? 'Not Assigned' : `Coach: ${booking.coachId.split('-')[0] || 'Pending'} | Seat: ${booking.seatNumber || 'Pending'} (${booking.seatPosition || 'Pending'})`,
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
