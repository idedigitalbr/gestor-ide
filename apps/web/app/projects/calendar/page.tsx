import { Suspense } from "react";
import { CalendarPage } from "@/components/crm-pages";

export default function Page() {
  return <Suspense fallback={null}><CalendarPage /></Suspense>;
}
