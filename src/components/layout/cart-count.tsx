"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { readCart } from "@/lib/cart";

export function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().reduce((total, item) => total + item.quantity, 0));
    update();
    window.addEventListener("guanar-cart", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("guanar-cart", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <span className="relative inline-flex">
      <Icon name="shopping_cart" className="text-xl" />
      {count > 0 ? (
        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary-container px-1 text-[10px] font-bold text-on-secondary-container">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </span>
  );
}
