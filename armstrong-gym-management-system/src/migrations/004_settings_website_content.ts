/**
 * Migration 004 — Add website content columns to settings
 *
 * New columns hold everything the admin can edit from the Settings panel
 * that appears on the public Portfolio page:
 *   - Gym contact info (phone, address, maps URL, Instagram, Facebook)
 *   - Opening hours (weekday string + Sunday string)
 *   - Hero stats bar (4 stat labels)
 *   - Membership plans (JSON array)
 *   - Hero tagline / about description
 *   - Booking WhatsApp number (for PT booking buttons)
 */

import type { Migration } from './runner';

const NEW_COLUMNS: Array<{ col: string; type: string; default: string }> = [
  { col: 'gym_phone',           type: 'TEXT', default: '0332 2464479' },
  { col: 'gym_address',         type: 'TEXT', default: 'Rimjhim Tower, Safoor, near KESC Society, Gulzar-e-Hijri, Scheme 33, Karachi 75270' },
  { col: 'gym_maps_url',        type: 'TEXT', default: 'https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9' },
  { col: 'gym_instagram_url',   type: 'TEXT', default: 'https://www.instagram.com/p/CWTOqdbIXqD/' },
  { col: 'gym_facebook_url',    type: 'TEXT', default: 'https://www.facebook.com/p/ArmStrong-gym-100064082887275/' },
  { col: 'gym_whatsapp_booking',type: 'TEXT', default: '923322464479' },
  { col: 'gym_timings_weekday', type: 'TEXT', default: 'Mon – Sat: 6:00 AM – 11:00 PM' },
  { col: 'gym_timings_sunday',  type: 'TEXT', default: 'Sunday: 8:00 AM – 8:00 PM' },
  { col: 'stat_members',        type: 'TEXT', default: '500+' },
  { col: 'stat_coaches',        type: 'TEXT', default: '10+' },
  { col: 'stat_floor_size',     type: 'TEXT', default: '5,000' },
  { col: 'stat_success_rate',   type: 'TEXT', default: '98%' },
  { col: 'hero_tagline',        type: 'TEXT', default: "Karachi's hardcore fitness sanctuary built for heavy lifters, fat loss seekers, and athletic transformations." },
  { col: 'plans_json',          type: 'TEXT', default: '[]' },
];

export const migration004: Migration = {
  version: '004',
  name:    'settings_website_content',
  async up(client) {
    for (const { col, type, default: def } of NEW_COLUMNS) {
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM information_schema.columns
         WHERE table_name = 'settings' AND column_name = $1`,
        [col]
      );
      if (rows[0].count === '0') {
        await client.query(
          `ALTER TABLE settings ADD COLUMN ${col} ${type} NOT NULL DEFAULT '${def.replace(/'/g, "''")}'`
        );
      }
    }
  },
};
