import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JARVIS_VOICE_ID = "612b878b113047d9a770c069c8b4fdfe";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const FISH_AUDIO_API_KEY = Deno.env.get('FISH_AUDIO_API_KEY');

    if (!FISH_AUDIO_API_KEY) {
      console.error('FISH_AUDIO_API_KEY is not configured');
      throw new Error('FISH_AUDIO_API_KEY is not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    console.log('Generating speech for text:', text.substring(0, 50) + '...');

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        reference_id: JARVIS_VOICE_ID,
        format: 'mp3',
        mp3_bitrate: 128,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fish Audio API error:', response.status, errorText);
      throw new Error(`Fish Audio API error: ${response.status}`);
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    console.log('Speech generated successfully, size:', audioBuffer.byteLength);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
