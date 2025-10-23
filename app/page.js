"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HackathonShowcase from "./components/HackathonShowcase";

export default function HomePage() {
  const router = useRouter();
  const [showShowcase] = useState(true);

  // Check if we should show the hackathon showcase or go directly to game
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const directToGame = urlParams.get('direct') === 'true';
    
    if (directToGame) {
      router.push("/game");
    }
  }, [router]);

  if (showShowcase) {
    return <HackathonShowcase />;
  }

  return (
    <div className="w-screen h-screen bg-black text-green-300 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl mb-4">Survive the Night</h1>
        <p className="text-xl">Loading game...</p>
      </div>
    </div>
  );
}