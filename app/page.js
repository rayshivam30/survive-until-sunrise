"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the game
    router.push("/game");
  }, [router]);

  return (
    <div className="w-screen h-screen bg-black text-green-300 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl mb-4">Survive the Night</h1>
        <p className="text-xl">Loading game...</p>
      </div>
    </div>
  );
}