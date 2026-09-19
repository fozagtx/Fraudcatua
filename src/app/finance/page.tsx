import { Suspense } from "react";
import { FinanceClient } from "./FinanceClient";

export const metadata = { title: "Finance: Fraudcatua" };

export default function FinancePage() {
  return (
    <Suspense>
      <FinanceClient />
    </Suspense>
  );
}
