"use client";

import { AuctionRoom } from "@/components/AuctionRoom";
import { use } from "react";

export default function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AuctionRoom id={id} />;
}
