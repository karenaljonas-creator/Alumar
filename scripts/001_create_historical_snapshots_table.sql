-- Create historical_snapshots table to store weekly machine snapshots
CREATE TABLE IF NOT EXISTS public.historical_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL DEFAULT 'CT-2025-001',
  week_number TEXT NOT NULL,
  week_date DATE NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, week_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_contract_week 
  ON public.historical_snapshots(contract_id, week_number);

CREATE INDEX IF NOT EXISTS idx_historical_snapshots_week_date 
  ON public.historical_snapshots(week_date DESC);

-- Enable Row Level Security
ALTER TABLE public.historical_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this app)
-- Allow anyone to read snapshots
CREATE POLICY "Allow public read access" 
  ON public.historical_snapshots 
  FOR SELECT 
  USING (true);

-- Allow anyone to insert snapshots
CREATE POLICY "Allow public insert access" 
  ON public.historical_snapshots 
  FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to update snapshots
CREATE POLICY "Allow public update access" 
  ON public.historical_snapshots 
  FOR UPDATE 
  USING (true);

-- Allow anyone to delete snapshots
CREATE POLICY "Allow public delete access" 
  ON public.historical_snapshots 
  FOR DELETE 
  USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_historical_snapshots_updated_at ON public.historical_snapshots;
CREATE TRIGGER update_historical_snapshots_updated_at
  BEFORE UPDATE ON public.historical_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
