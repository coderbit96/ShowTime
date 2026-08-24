import type { Metadata } from "next";
import { GroupBookingPanel } from "@/components/booking/group-booking-panel";

export const metadata: Metadata = {
  title: "Group booking | Show Time",
  description: "Create group bookings, invite friends, and split payments.",
};

export default function GroupsPage() {
  return <GroupBookingPanel />;
}
