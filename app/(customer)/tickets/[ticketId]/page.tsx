import { TicketView } from "@/components/tickets/ticket-view";
import { pageMetadata } from "@/lib/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return pageMetadata({
    title: "Ticket",
    description: "View your Show Time ticket.",
    path: `/tickets/${encodeURIComponent(ticketId)}`,
    index: false,
  });
}

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
