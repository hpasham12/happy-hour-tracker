# happy-hours

## Bulk-seeding the database

Instead of adding restaurants one-by-one in the UI, you can bulk-import them:

1. Copy the example and edit it with your data:
   ```bash
   cp scripts/seed-data.example.json scripts/seed-data.json
   ```
   Each restaurant needs a `name` and `address`. `latitude`/`longitude` are
   optional — if omitted, the address is geocoded automatically. `happy_hours`
   is a list of `{ day_of_week (0=Sun..6=Sat), start_time, end_time, food_deals,
   drink_deals, daily_specials }`; deals are `[{ name, price }]`.

2. Make sure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

3. Run the seeder:
   ```bash
   npm run seed                 # uses scripts/seed-data.json
   npm run seed -- other.json   # or a custom file
   ```

The script skips restaurants that already exist (same name + address), so it is
safe to re-run as you grow the list. `scripts/seed-data.json` is gitignored.