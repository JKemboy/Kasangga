BEGIN;
COMMENT ON COLUMN public.payment_allocations.osas_amount IS 'Legacy column name: 5% admin share, included in the 10% platform allocation.';
COMMENT ON COLUMN public.payment_allocations.platform_amount IS 'Legacy column name: 5% maintenance share. Total platform allocation is platform_amount + osas_amount (10%); tutor_amount is 90%.';
COMMIT;
