import { Howl } from "howler";

export const ambientSound = new Howl({
  src: ["/sounds/ambient.mp3"],
  loop: true,
  volume: 0.3,
});

export const jumpScareSound = new Howl({
  src: ["/sounds/jump-scare.mp3"],
  volume: 1,
});

export const whisperSound = new Howl({
  src: ["/sounds/whisper.mp3"],
  volume: 0.5,
});

export const playAmbient = () => ambientSound.play();
export const stopAmbient = () => ambientSound.stop();
export const playJumpScare = () => jumpScareSound.play();
export const playWhisper = () => whisperSound.play();
