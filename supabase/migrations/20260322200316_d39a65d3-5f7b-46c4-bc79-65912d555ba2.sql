
CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(ref_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Try profiles.referral_code first
  SELECT json_build_object(
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'creator_type', p.creator_type,
    'username', p.username
  ) INTO result
  FROM profiles p
  WHERE p.referral_code = ref_code
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Try invite_codes
  SELECT json_build_object(
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'creator_type', p.creator_type,
    'username', p.username
  ) INTO result
  FROM invite_codes ic
  JOIN profiles p ON p.user_id = ic.owner_id
  WHERE ic.code = ref_code
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Try waitlist referral_code
  SELECT json_build_object(
    'display_name', w.full_name,
    'avatar_url', w.referrer_avatar_url,
    'creator_type', null,
    'username', w.referrer_username
  ) INTO result
  FROM waitlist w
  WHERE w.referral_code = ref_code
  LIMIT 1;

  RETURN result;
END;
$$;
