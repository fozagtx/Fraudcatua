"use client";

import { Mascot as PageMascot } from "page-mascot";

export function Mascot({ size = 140 }: { size?: number }) {
  return (
    <PageMascot
      directions="/mascots/afro-directions.webp"
      reactions="/mascots/afro-reactions.webp"
      size={size}
      label="Fraudcatua mascot"
    />
  );
}
