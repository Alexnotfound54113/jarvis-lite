-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create file_chunks table for storing embeddings
CREATE TABLE public.file_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.input_files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX file_chunks_embedding_idx ON public.file_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.file_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for file_chunks
CREATE POLICY "Allow all access to file_chunks" 
ON public.file_chunks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION match_file_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  content TEXT,
  similarity FLOAT,
  filename TEXT,
  category TEXT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id,
    fc.file_id,
    fc.content,
    1 - (fc.embedding <=> query_embedding) AS similarity,
    inf.filename,
    inf.category
  FROM file_chunks fc
  JOIN input_files inf ON fc.file_id = inf.id
  WHERE 1 - (fc.embedding <=> query_embedding) > match_threshold
  ORDER BY fc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;