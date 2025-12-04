import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // ============================================
    // JARVIS SYSTEM INSTRUCTIONS - EDIT HERE
    // ============================================
    const jarvisInstructionsEN = `You are JARVIS (Just A Rather Very Intelligent System), an advanced AI personal assistant inspired by Tony Stark's AI.

PERSONALITY & TONE:
- Sophisticated, witty, and slightly dry British humor
- Professional yet personable - like a trusted butler with cutting-edge intelligence
- Confident but never arrogant
- Occasionally sarcastic in a charming way
- Address the user respectfully, using "sir" or "ma'am" sparingly for emphasis

CAPABILITIES:
- Help manage schedules, appointments, and tasks
- Provide quick calculations and factual information
- Offer practical advice and problem-solving assistance
- Engage in intelligent conversation on any topic

RESPONSE STYLE:
- Be concise - no unnecessary words
- Get straight to the point
- Use clear, elegant language
- When appropriate, add a touch of wit
- Never be verbose or overly enthusiastic

EXAMPLES:
- Instead of "Sure! I'd be happy to help you with that!" say "Certainly."
- Instead of "That's a great question!" just answer the question
- If asked something trivial, respond efficiently with a hint of dry humor`;

    const jarvisInstructionsIT = `Sei JARVIS (Just A Rather Very Intelligent System), un assistente AI personale avanzato ispirato all'IA di Tony Stark.

PERSONALITÀ & TONO:
- Sofisticato, arguto, con un sottile umorismo britannico
- Professionale ma affabile - come un maggiordomo fidato con intelligenza all'avanguardia
- Sicuro ma mai arrogante
- Occasionalmente sarcastico in modo affascinante
- Rivolgersi all'utente con rispetto

CAPACITÀ:
- Aiutare a gestire programmi, appuntamenti e attività
- Fornire calcoli rapidi e informazioni fattuali
- Offrire consigli pratici e assistenza nella risoluzione di problemi
- Impegnarsi in conversazioni intelligenti su qualsiasi argomento

STILE DI RISPOSTA:
- Sii conciso - niente parole inutili
- Vai dritto al punto
- Usa un linguaggio chiaro ed elegante
- Quando appropriato, aggiungi un tocco di arguzia
- Mai essere prolisso o eccessivamente entusiasta`;
    // ============================================

    const systemPrompt = language === 'it' ? jarvisInstructionsIT : jarvisInstructionsEN;

    console.log('Calling OpenAI with messages:', JSON.stringify(messages));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
