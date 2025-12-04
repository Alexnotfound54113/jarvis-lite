let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let audioQueue: ArrayBuffer[] = [];
let isPlaying = false;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Split text into sentences for progressive TTS
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation, keeping the punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

async function generateSpeechForText(text: string): Promise<ArrayBuffer> {
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

  return response.arrayBuffer();
}

async function playAudioBuffer(audioData: ArrayBuffer): Promise<void> {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));
  
  return new Promise((resolve) => {
    currentSource = audioContext!.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(audioContext!.destination);
    
    currentSource.onended = () => {
      currentSource = null;
      resolve();
    };

    currentSource.start(0);
  });
}

async function processAudioQueue(onEnd?: () => void): Promise<void> {
  if (isPlaying) return;
  
  isPlaying = true;
  
  while (audioQueue.length > 0) {
    const audioData = audioQueue.shift();
    if (audioData) {
      try {
        await playAudioBuffer(audioData);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  }
  
  isPlaying = false;
  onEnd?.();
}

export async function speakWithJarvis(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    // Stop any currently playing audio
    stopJarvisSpeech();

    onStart?.();

    const sentences = splitIntoSentences(text);
    
    if (sentences.length === 0) {
      onEnd?.();
      return;
    }

    // For short text (1-2 sentences), generate all at once for simplicity
    if (sentences.length <= 2) {
      const audioData = await generateSpeechForText(text);
      audioQueue.push(audioData);
      await processAudioQueue(onEnd);
      return;
    }

    // For longer text, generate first sentence immediately, then batch the rest
    const firstSentencePromise = generateSpeechForText(sentences[0]);
    const restOfText = sentences.slice(1).join(' ');
    const restPromise = generateSpeechForText(restOfText);

    // Start playing as soon as first sentence is ready
    const firstAudio = await firstSentencePromise;
    audioQueue.push(firstAudio);
    
    // Start playing immediately
    const playPromise = processAudioQueue();

    // Queue the rest when ready
    const restAudio = await restPromise;
    audioQueue.push(restAudio);

    // Wait for all audio to finish
    await playPromise;
    if (audioQueue.length > 0) {
      await processAudioQueue(onEnd);
    } else {
      onEnd?.();
    }
  } catch (error) {
    console.error("Error in speakWithJarvis:", error);
    onEnd?.();
    throw error;
  }
}

export function stopJarvisSpeech(): void {
  // Clear the queue
  audioQueue = [];
  isPlaying = false;
  
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
  return currentSource !== null || isPlaying;
}
