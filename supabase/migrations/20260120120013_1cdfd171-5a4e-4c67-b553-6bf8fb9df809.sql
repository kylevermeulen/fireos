-- Create mortgage_overrides table for persisting user edits
-- These overrides take precedence over CSV imports
CREATE TABLE public.mortgage_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT mortgage_overrides_user_field_unique UNIQUE (user_id, field_name)
);

-- Enable RLS
ALTER TABLE public.mortgage_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own overrides" 
ON public.mortgage_overrides 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own overrides" 
ON public.mortgage_overrides 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides" 
ON public.mortgage_overrides 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides" 
ON public.mortgage_overrides 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mortgage_overrides_updated_at
BEFORE UPDATE ON public.mortgage_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();