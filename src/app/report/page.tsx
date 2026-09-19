import { Suspense } from "react";
import { ReportClient } from "./ReportClient";

export const metadata = { title: "Report a number: Fraudcatua" };

export default function ReportPage() {
  return (
    <Suspense>
      <ReportClient />
    </Suspense>
  );
}
