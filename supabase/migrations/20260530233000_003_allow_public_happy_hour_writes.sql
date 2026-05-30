/*
  # Allow public happy hour edits

  The app currently uses the anonymous Supabase client and does not have an
  authentication flow, so public UI saves need matching RLS policies.
*/

DROP POLICY IF EXISTS "Authenticated users can add restaurants" ON restaurants;
DROP POLICY IF EXISTS "Authenticated users can update restaurants" ON restaurants;
DROP POLICY IF EXISTS "Authenticated users can delete restaurants" ON restaurants;
DROP POLICY IF EXISTS "Authenticated users can add happy hours" ON happy_hours;
DROP POLICY IF EXISTS "Authenticated users can update happy hours" ON happy_hours;
DROP POLICY IF EXISTS "Authenticated users can delete happy hours" ON happy_hours;

CREATE POLICY "Anyone can add restaurants"
  ON restaurants FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update restaurants"
  ON restaurants FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete restaurants"
  ON restaurants FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Anyone can add happy hours"
  ON happy_hours FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update happy hours"
  ON happy_hours FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete happy hours"
  ON happy_hours FOR DELETE
  TO public
  USING (true);
