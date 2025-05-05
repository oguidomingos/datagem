-- Create the table to store synced WooCommerce data
CREATE TABLE public.synced_woocommerce_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'woocommerce',
  payload JSONB,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for faster querying
CREATE INDEX idx_synced_woocommerce_data_project_id ON public.synced_woocommerce_data(project_id);
CREATE INDEX idx_synced_woocommerce_data_synced_at ON public.synced_woocommerce_data(synced_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.synced_woocommerce_data ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.synced_woocommerce_data TO authenticated;
GRANT ALL ON TABLE public.synced_woocommerce_data TO service_role;

-- Policy: Users can view data for projects they are associated with
CREATE POLICY "Allow users to view their project woocommerce data"
  ON public.synced_woocommerce_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = synced_woocommerce_data.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Allow service_role full access (needed for API routes/server-side operations)
-- Note: This assumes API routes run with service_role key. Adjust if needed.
CREATE POLICY "Allow service_role full access"
  ON public.synced_woocommerce_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Add comments for clarity
COMMENT ON TABLE public.synced_woocommerce_data IS 'Stores raw data payloads synced from WooCommerce via Airbyte for each project.';
COMMENT ON COLUMN public.synced_woocommerce_data.project_id IS 'Links the synced data to a specific project.';
COMMENT ON COLUMN public.synced_woocommerce_data.payload IS 'The JSONB payload received from the Airbyte sync.';
COMMENT ON COLUMN public.synced_woocommerce_data.synced_at IS 'Timestamp of when the Airbyte sync job completed for this data.';