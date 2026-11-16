"use client";

import { Icon } from "@/components/ui";
import { deleteProductAction } from "@/lib/actions/supplier";
import { PendingButton } from "@/components/forms/pending-button";

export function DeleteProductButton({ productId, name }: { productId: string; name: string }) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(event) => {
        if (!window.confirm(`Supprimer définitivement « ${name} » ? Si le produit a déjà servi, il sera archivé.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <PendingButton variant="outline" size="sm" className="text-[#a8421a]" pendingLabel="Suppression…">
        <Icon name="delete" className="text-base" />
        Supprimer
      </PendingButton>
    </form>
  );
}
