/*
  # Store food and drink deals as item lists

  Converts the single text deal fields into JSON arrays of objects:
  [{ "name": "House margarita", "price": "$6" }]

  Existing non-empty text values are preserved as one item with an empty price.
*/

ALTER TABLE happy_hours
  ALTER COLUMN food_deals DROP DEFAULT,
  ALTER COLUMN food_deals TYPE jsonb
    USING CASE
      WHEN food_deals IS NULL OR btrim(food_deals) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('name', food_deals, 'price', ''))
    END,
  ALTER COLUMN food_deals SET DEFAULT '[]'::jsonb,
  ALTER COLUMN drink_deals DROP DEFAULT,
  ALTER COLUMN drink_deals TYPE jsonb
    USING CASE
      WHEN drink_deals IS NULL OR btrim(drink_deals) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('name', drink_deals, 'price', ''))
    END,
  ALTER COLUMN drink_deals SET DEFAULT '[]'::jsonb;
