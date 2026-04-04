
-- Drop the dangerous anon policy that exposes ALL invite codes
DROP POLICY IF EXISTS "Anon can read codes for validation" ON public.invite_codes;

-- Create a secure function for code validation (used during onboarding)
-- This lets the client look up a SPECIFIC code without exposing the full table
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', ic.id,
    'is_used', ic.is_used,
    'owner_id', ic.owner_id
  ) INTO result
  FROM invite_codes ic
  WHERE ic.code = p_code
  LIMIT 1;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute to authenticated (used during onboarding)
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO authenticated;
-- Also grant to anon for the ReferralRedirect page lookup
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon;
