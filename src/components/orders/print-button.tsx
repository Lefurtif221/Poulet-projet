"use client";

import { Button, Icon } from "@/components/ui";

export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <Icon name="print" className="text-lg" />
      Imprimer / Enregistrer en PDF
    </Button>
  );
}
