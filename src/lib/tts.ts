let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function speakWithJarvis(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    // Stop any currently playing audio
    stopJarvisSpeech();

    onStart?.();

    // Use direct fetch for binary audio response
    const response = await fetch(`${SUPABASE_URL}/functions/v1/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("TTS API error:", response.status, errorData);
      throw new Error(errorData.error || "Failed to generate speech");
    }

    // Get audio as ArrayBuffer
    const audioData = await response.arrayBuffer();

    // Handle the audio response
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
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
