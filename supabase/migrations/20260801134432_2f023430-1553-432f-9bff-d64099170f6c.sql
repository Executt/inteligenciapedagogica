REVOKE EXECUTE ON FUNCTION public.purge_pulse_nonces() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_pulse_nonces() TO service_role;