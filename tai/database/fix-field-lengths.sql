-- Fix database field lengths for slide content
-- Run this migration to increase field sizes

-- Increase title field lengths
ALTER TABLE presentations ALTER COLUMN title TYPE VARCHAR(1000);
ALTER TABLE slides ALTER COLUMN title TYPE VARCHAR(1000);

-- Increase content fields - use TEXT for unlimited length
ALTER TABLE slides ALTER COLUMN content TYPE TEXT;
ALTER TABLE slides ALTER COLUMN speaker_notes TYPE TEXT;
ALTER TABLE slide_elements ALTER COLUMN content TYPE TEXT;

-- Increase URL fields
ALTER TABLE presentations ALTER COLUMN source_url TYPE TEXT;
ALTER TABLE slides ALTER COLUMN thumbnail_url TYPE TEXT;
ALTER TABLE slides ALTER COLUMN gcs_content_path TYPE TEXT;
ALTER TABLE slides ALTER COLUMN gcs_thumbnail_path TYPE TEXT;