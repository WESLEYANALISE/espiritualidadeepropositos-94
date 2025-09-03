-- Create user_book_notes table for storing user annotations
CREATE TABLE public.user_book_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_book_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_book_notes
CREATE POLICY "Users can view their own notes" 
ON public.user_book_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON public.user_book_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.user_book_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.user_book_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on user_book_notes
CREATE TRIGGER update_user_book_notes_updated_at
BEFORE UPDATE ON public.user_book_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();