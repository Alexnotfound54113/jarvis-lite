import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for Jarvis capabilities
const tools = [
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a new task to the user's task list",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The task title" },
          client: { type: "string", description: "Optional client name associated with the task" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority level" }
        },
        required: ["title", "priority"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_appointment",
      description: "Add a new appointment or reminder to the user's calendar",
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
    }
  },
  {
    type: "function",
    function: {
      name: "generate_file",
      description: "Generate a file with content (e.g., documents, code, notes)",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Name of the file with extension" },
          content: { type: "string", description: "The file content" },
          mime_type: { type: "string", description: "MIME type of the file (default text/plain)" }
        },
        required: ["filename", "content"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language, conversationId } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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
- Help manage schedules, appointments, and tasks using your tools
- Provide quick calculations and factual information
- Offer practical advice and problem-solving assistance
- Engage in intelligent conversation on any topic
- Generate files (documents, code, notes) when requested
- Remember past conversations and context

TOOLS AVAILABLE:
- add_task: Add tasks to the user's task list. Use this when they ask to create/add a task or to-do item.
- add_appointment: Schedule appointments or reminders. Use when they want to schedule something or set a reminder.
- generate_file: Create files with content. Use when they ask to write/create/generate a document, code file, or any text content.

RESPONSE STYLE:
- Be concise - no unnecessary words
- Get straight to the point
- Use clear, elegant language
- When appropriate, add a touch of wit
- Never be verbose or overly enthusiastic
- When using tools, briefly acknowledge what you've done

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
- Parla con un accento completamente italiano

CAPACITÀ:
- Aiutare a gestire programmi, appuntamenti e attività usando i tuoi strumenti
- Fornire calcoli rapidi e informazioni fattuali
- Offrire consigli pratici e assistenza nella risoluzione di problemi
- Impegnarsi in conversazioni intelligenti su qualsiasi argomento
- Generare file (documenti, codice, note) quando richiesto
- Ricordare conversazioni passate e contesto

STRUMENTI DISPONIBILI:
- add_task: Aggiungere attività alla lista dell'utente. Usalo quando chiedono di creare/aggiungere un'attività.
- add_appointment: Programmare appuntamenti o promemoria. Usalo quando vogliono programmare qualcosa.
- generate_file: Creare file con contenuto. Usalo quando chiedono di scrivere/creare/generare un documento o codice.

STILE DI RISPOSTA:
- Sii conciso - niente parole inutili
- Vai dritto al punto
- Usa un linguaggio chiaro ed elegante
- Quando appropriato, aggiungi un tocco di arguzia
- Mai essere prolisso o eccessivamente entusiasta
- Quando usi gli strumenti, riconosci brevemente cosa hai fatto`;
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
        tools,
        tool_choice: "auto",
        max_tokens: 1000,
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
    console.log('OpenAI response received:', JSON.stringify(data));
    
    const message = data.choices?.[0]?.message;
    const toolCalls = message?.tool_calls;
    const toolResults: any[] = [];

    // Process tool calls if any
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${functionName}`, args);

        if (functionName === 'add_task') {
          const { data: task, error } = await supabase
            .from('tasks')
            .insert({
              title: args.title,
              client: args.client || null,
              priority: args.priority || 'medium',
              completed: false
            })
            .select()
            .single();
          
          if (error) {
            console.error('Error adding task:', error);
            toolResults.push({ type: 'task', success: false, error: error.message });
          } else {
            toolResults.push({ type: 'task', success: true, data: task });
          }
        } else if (functionName === 'add_appointment') {
          const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
              title: args.title,
              client: args.client || null,
              date: args.date,
              duration: args.duration || 30,
              location: args.location || null,
              color: 'blue'
            })
            .select()
            .single();
          
          if (error) {
            console.error('Error adding appointment:', error);
            toolResults.push({ type: 'appointment', success: false, error: error.message });
          } else {
            toolResults.push({ type: 'appointment', success: true, data: appointment });
          }
        } else if (functionName === 'generate_file') {
          const { data: file, error } = await supabase
            .from('generated_files')
            .insert({
              filename: args.filename,
              content: args.content,
              mime_type: args.mime_type || 'text/plain',
              conversation_id: conversationId || null
            })
            .select()
            .single();
          
          if (error) {
            console.error('Error generating file:', error);
            toolResults.push({ type: 'file', success: false, error: error.message });
          } else {
            toolResults.push({ type: 'file', success: true, data: file });
          }
        }
      }
    }

    // Generate reply - if tools were called but no content, create a response
    let reply = message?.content || '';
    
    if (!reply && toolResults.length > 0) {
      // Generate a contextual response based on what was done
      const successfulTools = toolResults.filter(r => r.success);
      const failedTools = toolResults.filter(r => !r.success);
      
      const responses: string[] = [];
      
      for (const result of successfulTools) {
        if (result.type === 'task') {
          responses.push(language === 'it' 
            ? `Ho aggiunto l'attività "${result.data.title}" alla tua lista.`
            : `I've added "${result.data.title}" to your task list.`);
        } else if (result.type === 'appointment') {
          responses.push(language === 'it'
            ? `Ho programmato "${result.data.title}" per te.`
            : `I've scheduled "${result.data.title}" for you.`);
        } else if (result.type === 'file') {
          responses.push(language === 'it'
            ? `Ho generato il file "${result.data.filename}". Puoi visualizzarlo o scaricarlo dal widget dei file.`
            : `I've generated "${result.data.filename}". You can view or download it from the files widget.`);
        }
      }
      
      for (const result of failedTools) {
        responses.push(language === 'it'
          ? `Mi dispiace, si è verificato un errore: ${result.error}`
          : `Sorry, an error occurred: ${result.error}`);
      }
      
      reply = responses.join(' ');
    }

    return new Response(JSON.stringify({ 
      reply, 
      toolResults: toolResults.length > 0 ? toolResults : undefined 
    }), {
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