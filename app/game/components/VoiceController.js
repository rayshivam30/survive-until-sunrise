"use client";

import { useEffect } from "react";

export default function VoiceController({ onCommand }) {
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      onCommand(transcript);
    };

    recognition.start();

    return () => recognition.stop();
  }, [onCommand]);

  return null;
}
