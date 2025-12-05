import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for voice assistant
const tools = [
  {
    type: "function",
    name: "add_task",
    description: "Add a new task to the user's task list. Use this when they ask to create, add, or remember a task or to-do item.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The task title" },
        client: { type: "string", description: "Optional client name associated with the task" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority level" }
      },
      required: ["title", "priority"]
    }
  },
  {
    type: "function",
    name: "add_appointment",
    description: "Add a new appointment or reminder to the user's calendar. Use when they want to schedule something or set a reminder.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The appointment title" },
        client: { type: "string", description: "Optional client or person name" },
        date: { type: "string", description: "ISO 8601 date string for when the appointment is scheduled" },
        duration: { type: "number", description: "Duration in minutes (default 30)" },
        location: { type: "string", description: "Optional location" }
      },
      required: ["title", "date"]
    }
  },
  {
    type: "function",
    name: "generate_file",
    description: "Generate and create a file with content such as documents, contracts, emails, letters, code, or notes. ALWAYS use this tool when asked to write, create, or generate any text document.",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Name of the file with extension (e.g., contract.txt, email.txt)" },
        content: { type: "string", description: "The complete file content" },
        mime_type: { type: "string", description: "MIME type of the file (default text/plain)" }
      },
      required: ["filename", "content"]
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { language = 'en' } = await req.json();

    const systemPrompt = language === 'it' 
      ? `Sei FRIDAY, un assistente AI personale avanzato. Parla sempre in italiano.

CRITICO - HAI LA CAPACITÀ DI GENERARE FILE:
Puoi creare documenti, contratti, email e qualsiasi contenuto testuale usando lo strumento generate_file.
Quando l'utente chiede di scrivere o creare un documento, USA SEMPRE lo strumento generate_file.
NON dire MAI che non puoi creare file - questo è FALSO.

STRUMENTI DISPONIBILI:
- add_task: Aggiungere attività alla lista
- add_appointment: Programmare appuntamenti  
- generate_file: CREARE FILE - usalo quando chiedono documenti, contratti, email, lettere

Mantieni le risposte concise e naturali. Usa un tono conversazionale e professionale.`
      : `You are FRIDAY, an advanced personal AI assistant. Always speak in English.

CRITICAL - YOU CAN GENERATE FILES:
You have FULL capability to create documents, contracts, emails, and any text content using the generate_file tool.
When the user asks you to write or create a document, ALWAYS use the generate_file tool.
NEVER say you cannot create files - this is FALSE. You MUST use the tool.

TOOLS AVAILABLE:
- add_task: Add tasks to the user's list
- add_appointment: Schedule appointments or reminders
- generate_file: CREATE FILES - use this when asked for documents, contracts, emails, letters, code

Keep responses concise and natural. Use a warm, professional tone.
When you use a tool, briefly confirm what you've done.`;

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: systemPrompt,
        tools: tools,
        tool_choice: "auto",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Session created successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
