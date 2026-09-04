import { GroupBookingPanel } from "@/components/booking/group-booking-panel";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Group booking | Show Time",
  description: "Create group bookings, invite friends, and split payments.",
  path: "/groups",
});

export default function GroupsPage() {
  return <GroupBookingPanel />;
}
