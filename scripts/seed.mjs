#!/usr/bin/env node
/*
 * Bulk-populate the happy_hours database from a JSON file instead of entering
 * each restaurant by hand in the UI.
 *
 * Usage:
 *   1. Copy scripts/seed-data.example.json -> scripts/seed-data.json and edit it.
 *   2. Make sure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *      (public writes are allowed by RLS, so the anon key is enough).
 *   3. npm run seed            # seeds scripts/seed-data.json
 *      npm run seed -- my.json # seeds a custom file
 *
 * Each restaurant is geocoded from its address via OpenStreetMap Nominatim when
 * latitude/longitude are not provided. Restaurants already present (same name +
 * address) are skipped so the script is safe to re-run.
 */

import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(projectRoot, '.env');
  const env = { ...process.env };
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      if (!(key in env)) env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'happy-hour-tracker-seed/1.0' },
  });
  if (!response.ok) throw new Error(`Geocode failed (${response.status}) for "${address}"`);
  const results = await response.json();
  if (!results.length) throw new Error(`No geocode match for "${address}"`);
  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
    display: results[0].display_name,
  };
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (set them in .env).');
    process.exit(1);
  }

  const dataArg = process.argv[2] ?? 'scripts/seed-data.json';
  const dataPath = resolve(projectRoot, dataArg);
  if (!existsSync(dataPath)) {
    console.error(`Seed file not found: ${dataPath}`);
    console.error('Copy scripts/seed-data.example.json to scripts/seed-data.json and edit it.');
    process.exit(1);
  }

  const restaurants = JSON.parse(await readFile(dataPath, 'utf8'));
  if (!Array.isArray(restaurants)) {
    console.error('Seed file must be a JSON array of restaurants.');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let added = 0;
  let skipped = 0;

  for (const entry of restaurants) {
    const name = entry.name?.trim();
    const address = entry.address?.trim();
    if (!name || !address) {
      console.warn(`Skipping entry missing name/address: ${JSON.stringify(entry)}`);
      continue;
    }

    const { data: existing, error: lookupError } = await supabase
      .from('restaurants')
      .select('id')
      .ilike('name', name)
      .ilike('address', address)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      console.log(`= Skip (already exists): ${name}`);
      skipped += 1;
      continue;
    }

    let { latitude, longitude } = entry;
    if (latitude == null || longitude == null) {
      const geo = await geocode(address);
      latitude = geo.latitude;
      longitude = geo.longitude;
      await sleep(1100); // Nominatim asks for <= 1 request/second.
    }

    const { data: inserted, error: insertError } = await supabase
      .from('restaurants')
      .insert({ name, address, latitude, longitude, is_inkind: Boolean(entry.is_inkind) })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const happyHours = Array.isArray(entry.happy_hours) ? entry.happy_hours : [];
    if (happyHours.length > 0) {
      const rows = happyHours.map((hh) => ({
        restaurant_id: inserted.id,
        day_of_week: hh.day_of_week,
        start_time: hh.start_time,
        end_time: hh.end_time,
        food_deals: hh.food_deals ?? [],
        drink_deals: hh.drink_deals ?? [],
        daily_specials: hh.daily_specials ?? '',
      }));
      const { error: hhError } = await supabase.from('happy_hours').insert(rows);
      if (hhError) throw hhError;
    }

    console.log(`+ Added: ${name} (${happyHours.length} happy hour${happyHours.length === 1 ? '' : 's'})`);
    added += 1;
  }

  console.log(`\nDone. Added ${added}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
