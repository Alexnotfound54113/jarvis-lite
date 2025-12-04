import { supabase } from "@/integrations/supabase/client";

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

export async function speakWithJarvis(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    // Stop any currently playing audio
    stopJarvisSpeech();

    onStart?.();

    const { data, error } = await supabase.functions.invoke("text-to-speech", {
      body: { text },
    });

    if (error) {
      console.error("Error calling TTS function:", error);
      throw new Error("Failed to generate speech");
    }

    // Handle the audio response
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Convert response to ArrayBuffer
    let audioData: ArrayBuffer;
    if (data instanceof ArrayBuffer) {
      audioData = data;
    } else if (data instanceof Blob) {
      audioData = await data.arrayBuffer();
    } else {
      // If it's a base64 string or other format
      throw new Error("Unexpected response format");
    }

    // Decode and play the audio
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(audioContext.destination);
    
    currentSource.onended = () => {
      currentSource = null;
      onEnd?.();
    };

    currentSource.start(0);
  } catch (error) {
    console.error("Error in speakWithJarvis:", error);
    onEnd?.();
    throw error;
  }
}

export function stopJarvisSpeech(): void {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // Ignore errors if already stopped
    }
    currentSource = null;
  }
}

export function isJarvisSpeaking(): boolean {
  return currentSource !== null;
}
