import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize text to remove null characters and problematic Unicode sequences
function sanitizeText(text: string): string {
  return text
    // Remove null characters (PostgreSQL cannot store these)
    .replace(/\u0000/g, '')
    // Remove other control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Chunk text into smaller pieces for embedding
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  
  return chunks.filter(chunk => chunk.trim().length > 50);
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Extract text from various file types
async function extractText(file: File, content: ArrayBuffer): Promise<string> {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();
  
  // Plain text files
  if (mimeType.startsWith('text/') || 
      fileName.endsWith('.txt') || 
      fileName.endsWith('.md') || 
      fileName.endsWith('.csv') ||
      fileName.endsWith('.json')) {
    return new TextDecoder().decode(content);
  }
  
  // PDF - basic extraction (for complex PDFs, would need pdf-parse library)
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // Try to extract text from PDF
    const text = new TextDecoder().decode(content);
    // Extract text between stream markers (basic approach)
    const textMatch = text.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
    if (textMatch) {
      return textMatch.map(m => m.replace(/stream[\r\n]+/, '').replace(/[\r\n]+endstream/, '')).join(' ');
    }
    // Fallback: return raw text content
    return text.replace(/[^\x20-\x7E\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Word documents (docx) - basic XML extraction
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')) {
    // DOCX is a zip file with XML inside
    const text = new TextDecoder().decode(content);
    // Extract text from XML tags
    const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (matches) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    }
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Excel/spreadsheets - basic extraction
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx')) {
    const text = new TextDecoder().decode(content);
    const matches = text.match(/<t[^>]*>([^<]*)<\/t>/g);
    if (matches) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    }
    return '';
  }
  
  // Default: try to decode as text
  try {
    return new TextDecoder().decode(content);
  } catch {
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'general';
    const subcategory = formData.get('subcategory') as string || null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text from file and sanitize it
    const rawText = await extractText(file, arrayBuffer);
    const textContent = sanitizeText(rawText);
    
    if (!textContent || textContent.length < 10) {
      return new Response(JSON.stringify({ error: 'Could not extract text from file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Extracted ${textContent.length} characters from file`);

    // Upload original file to storage
    const storagePath = `input/${category}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('friday-files')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
    }

    // Save file metadata to input_files table
    const { data: inputFile, error: insertError } = await supabase
      .from('input_files')
      .insert({
        filename: file.name,
        mime_type: file.type,
        category,
        subcategory,
        content: textContent.slice(0, 50000), // Store first 50k chars
        file_size: file.size,
        storage_path: storagePath,
        metadata: { originalSize: file.size, extractedLength: textContent.length }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save file: ${insertError.message}`);
    }

    console.log(`File saved with ID: ${inputFile.id}`);

    // Chunk the text and generate embeddings
    const chunks = chunkText(textContent);
    console.log(`Created ${chunks.length} chunks for embedding`);

    const chunkInserts = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i], OPENAI_API_KEY);
        chunkInserts.push({
          file_id: inputFile.id,
          content: chunks[i],
          embedding: embedding,
          chunk_index: i
        });
        console.log(`Generated embedding for chunk ${i + 1}/${chunks.length}`);
      } catch (err) {
        console.error(`Error generating embedding for chunk ${i}:`, err);
      }
    }

    // Insert all chunks
    if (chunkInserts.length > 0) {
      const { error: chunksError } = await supabase
        .from('file_chunks')
        .insert(chunkInserts);

      if (chunksError) {
        console.error('Chunks insert error:', chunksError);
      } else {
        console.log(`Inserted ${chunkInserts.length} chunks with embeddings`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      file: {
        id: inputFile.id,
        filename: inputFile.filename,
        category: inputFile.category,
        chunks: chunkInserts.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to process file' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
