-- Database schema for storing slide presentations and metadata

-- Presentations table
CREATE TABLE presentations (
    id SERIAL PRIMARY KEY,
    presentation_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'google-slides' or 'pptx'
    source_url TEXT,
    slide_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255), -- user ID who imported the presentation
    thumbnail_url TEXT,
    locale VARCHAR(10),
    gcs_bucket VARCHAR(255), -- GCS bucket where slides are stored
    status VARCHAR(50) DEFAULT 'processing' -- 'processing', 'completed', 'error'
);

-- Individual slides table
CREATE TABLE slides (
    id SERIAL PRIMARY KEY,
    presentation_id INTEGER REFERENCES presentations(id) ON DELETE CASCADE,
    slide_id VARCHAR(255) NOT NULL,
    slide_number INTEGER NOT NULL,
    title VARCHAR(500),
    content TEXT,
    speaker_notes TEXT,
    thumbnail_url TEXT,
    gcs_content_path TEXT, -- Path to slide content in GCS
    gcs_thumbnail_path TEXT, -- Path to thumbnail in GCS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(presentation_id, slide_id)
);

-- Slide elements table (for detailed slide content)
CREATE TABLE slide_elements (
    id SERIAL PRIMARY KEY,
    slide_id INTEGER REFERENCES slides(id) ON DELETE CASCADE,
    element_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'shape'
    content TEXT NOT NULL,
    position_x FLOAT,
    position_y FLOAT,
    width FLOAT,
    height FLOAT,
    element_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table for tracking OAuth tokens
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Import jobs table for tracking async import processes
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    presentation_id INTEGER REFERENCES presentations(id),
    user_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_identifier TEXT NOT NULL, -- Google Slides ID or file path
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    progress INTEGER DEFAULT 0, -- 0-100
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX idx_presentations_presentation_id ON presentations(presentation_id);
CREATE INDEX idx_presentations_created_by ON presentations(created_by);
CREATE INDEX idx_presentations_status ON presentations(status);
CREATE INDEX idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX idx_slides_slide_number ON slides(slide_number);
CREATE INDEX idx_slide_elements_slide_id ON slide_elements(slide_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_presentations_updated_at BEFORE UPDATE ON presentations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_slides_updated_at BEFORE UPDATE ON slides 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON import_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();