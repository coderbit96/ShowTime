import { TicketView } from "@/components/tickets/ticket-view";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return (
    <main className="min-h-screen px-5 py-8">
      <TicketView ticketId={ticketId} />
    </main>
  );
}
