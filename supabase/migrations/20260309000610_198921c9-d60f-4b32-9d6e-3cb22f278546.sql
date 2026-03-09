
-- Add read policy for user_roles so linter is happy
create policy "Users can view own roles" on user_roles for select using (auth.uid() = user_id);
