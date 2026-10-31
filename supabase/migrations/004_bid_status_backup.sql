-- 004_bid_status_backup.sql
-- The seller dashboard marks a bid as the backup bidder, but the enum had no such value.
-- Kept in its own migration: a new enum value cannot be used in the same transaction
-- that adds it, and 005 relies on it.
ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'backup';
