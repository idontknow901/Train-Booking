import { useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Copy, ArrowLeft, Download } from 'lucide-react';
import { Booking } from '@/types/train';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface BookingConfirmationProps {
  booking: Booking;
  onClose: () => void;
}

export default function BookingConfirmation({ booking, onClose }: BookingConfirmationProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const copyPNR = () => {
    navigator.clipboard.writeText(booking.pnr);
    toast.success('PNR copied to clipboard');
  };

  const downloadTicket = async () => {
    if (!ticketRef.current) return;

    const toastId = toast.loading('Generating ticket...');
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Ticket_${booking.pnr}.pdf`);
      toast.success('Ticket downloaded successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to generate ticket', { id: toastId });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-md"
    >
      <div
        ref={ticketRef}
        className="rounded-2xl border border-border bg-card p-8 shadow-xl mb-4 text-foreground"
      >
        <div className="mb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <CheckCircle className="mx-auto mb-3 h-16 w-16 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold">
            {booking.status === 'CNF' ? 'Ticket Confirmed!' : booking.status === 'RAC' ? 'Ticket RAC' : 'Waitlisted (WL)'}
          </h2>
        </div>

        <div className="mb-6 rounded-lg bg-muted p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">PNR Number</span>
            <button onClick={copyPNR} className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors no-print">
              <Copy className="h-3 w-3" />
              <span className="text-xs">Copy</span>
            </button>
          </div>
          <p className="text-center font-mono text-3xl font-bold tracking-widest text-accent">{booking.pnr}</p>
        </div>

        <div className="space-y-2.5 text-sm font-medium">
          {[
            ['Status', booking.status === 'CNF' ? 'Confirmed (CNF)' : `${booking.status} ${booking.queueNumber}`],
            ['Passenger', booking.username],
            ['Train', `${booking.trainName} (#${booking.trainNumber})`],
            ['Route', `${booking.origin} → ${booking.destination}`],
            ['Coach / Seat', booking.status === 'WL' ? 'Not Assigned' : `${booking.coachId.split('-')[0] || 'Pending'} / Seat ${booking.seatNumber || 'Pending'} (${booking.seatPosition || 'Pending'})`],
            ['Journey Date', booking.journeyDate],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-dashed border-border text-[10px] text-center text-muted-foreground">
          This is an electronically generated ticket. No signature is required.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={downloadTicket} variant="outline" className="w-full h-11 rounded-xl border-accent text-accent hover:bg-accent/5">
          <Download className="mr-2 h-4 w-4" /> Download PDF Ticket
        </Button>
        <Button onClick={onClose} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>
      </div>
    </motion.div>
  );
}

