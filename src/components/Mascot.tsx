"use client";

import { Mascot as PageMascot } from "page-mascot";
import { config } from "@/config";

export function Mascot({ size = 140 }: { size?: number }) {
  return (
    <PageMascot
      directions={config.mascot.directions}
      reactions={config.mascot.reactions}
      size={size}
      label="Fraudcatua mascot"
    />
  );
}
