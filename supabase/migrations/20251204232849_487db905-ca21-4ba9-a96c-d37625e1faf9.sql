-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create input_files table for company data (RAG source)
CREATE TABLE public.input_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subcategory TEXT,
  content TEXT,
  mime_type TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create output_files table for FRIDAY-generated files
CREATE TABLE public.output_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document',
  content TEXT,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.input_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.output_files ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth yet)
CREATE POLICY "Allow all access to input_files" ON public.input_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to output_files" ON public.output_files FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('friday-files', 'friday-files', true);

-- Storage policies
CREATE POLICY "Public read friday-files" ON storage.objects FOR SELECT USING (bucket_id = 'friday-files');
CREATE POLICY "Public upload friday-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'friday-files');
CREATE POLICY "Public delete friday-files" ON storage.objects FOR DELETE USING (bucket_id = 'friday-files');

-- Trigger for updated_at
CREATE TRIGGER update_input_files_updated_at
BEFORE UPDATE ON public.input_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();