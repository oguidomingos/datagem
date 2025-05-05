-- Add status column to external_tokens table

ALTER TABLE public.external_tokens
ADD COLUMN status TEXT DEFAULT 'inactive' NOT NULL;

-- Add an index for faster status lookups
CREATE INDEX idx_external_tokens_status ON public.external_tokens(status);

-- Optional: Update existing tokens to 'active' if appropriate
-- UPDATE public.external_tokens SET status = 'active' WHERE provider = 'woocommerce'; -- Example

COMMENT ON COLUMN public.external_tokens.status IS 'Status of the token (e.g., active, inactive, expired)';