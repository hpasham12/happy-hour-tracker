/*
  # Create Restaurants and Happy Hours Tables

  1. New Tables
    - `restaurants`
      - `id` (uuid, primary key)
      - `name` (text, restaurant name)
      - `address` (text, street address)
      - `latitude` (decimal, geographic latitude)
      - `longitude` (decimal, geographic longitude)
      - `is_inkind` (boolean, whether on inkind platform)
      - `created_at` (timestamp)
    
    - `happy_hours`
      - `id` (uuid, primary key)
      - `restaurant_id` (uuid, foreign key to restaurants)
      - `day_of_week` (integer, 0-6 for Sunday-Saturday)
      - `start_time` (time, happy hour start)
      - `end_time` (time, happy hour end)
      - `food_deals` (text, description of food deals)
      - `drink_deals` (text, description of drink deals)
      - `daily_specials` (text, any special deals for that day)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Allow public read access (anyone can view restaurants)
    - Allow authenticated users to insert/update/delete

  3. Indexes
    - Index on restaurant_id in happy_hours for faster joins
    - Index on coordinates for geospatial queries
*/

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude decimal NOT NULL,
  longitude decimal NOT NULL,
  is_inkind boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create happy_hours table
CREATE TABLE IF NOT EXISTS happy_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  food_deals text DEFAULT '',
  drink_deals text DEFAULT '',
  daily_specials text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_happy_hours_restaurant_id ON happy_hours(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_coordinates ON restaurants(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hours ENABLE ROW LEVEL SECURITY;

-- Policies for restaurants table
CREATE POLICY "Anyone can view restaurants"
  ON restaurants FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can add restaurants"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update restaurants"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete restaurants"
  ON restaurants FOR DELETE
  TO authenticated
  USING (true);

-- Policies for happy_hours table
CREATE POLICY "Anyone can view happy hours"
  ON happy_hours FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can add happy hours"
  ON happy_hours FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update happy hours"
  ON happy_hours FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete happy hours"
  ON happy_hours FOR DELETE
  TO authenticated
  USING (true);