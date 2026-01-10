-- PULSE OS: GRAVITY ZONES MIGRATION
-- Adds physics-based properties to the tasks table

-- 1. Add Gravity Columns
ALTER TABLE tasks
ADD COLUMN gravity_score FLOAT DEFAULT 1.0, -- Current calculated weight
ADD COLUMN total_dwell_ms INTEGER DEFAULT 0, -- Total time spent hovering/viewing
ADD COLUMN last_interaction_ts TIMESTAMPTZ DEFAULT NOW(), -- Last time user touched this item
ADD COLUMN avoidance_count INTEGER DEFAULT 0, -- Times user 'avoided' this item
ADD COLUMN mass_tier TEXT DEFAULT 'light'; -- 'light', 'medium', 'heavy', 'blackhole'

-- 2. Index for Gravity Sorting (Critical for performance)
CREATE INDEX idx_tasks_gravity_score ON tasks(gravity_score DESC);

-- 3. Function to Calculate Gravity (The Physics Engine)
-- Gravity = (Priority * Age) + (Avoidance * 1.5)
CREATE OR REPLACE FUNCTION calculate_gravity(
    priority_val INTEGER, 
    created_ts TIMESTAMPTZ, 
    avoidance_cnt INTEGER
) RETURNS FLOAT AS $$
DECLARE
    age_hours FLOAT;
    base_gravity FLOAT;
BEGIN
    -- Calculate age in hours
    age_hours := EXTRACT(EPOCH FROM (NOW() - created_ts)) / 3600;
    
    -- Base calculation
    base_gravity := (priority_val * 10) + (age_hours * 0.5);
    
    -- Avoidance Multiplier (The "Weight of Guilt")
    IF avoidance_cnt > 0 THEN
        base_gravity := base_gravity * (1 + (avoidance_cnt * 0.2));
    END IF;
    
    RETURN base_gravity;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to Auto-Update Gravity on Interaction
CREATE OR REPLACE FUNCTION update_task_gravity() RETURNS TRIGGER AS $$
BEGIN
    NEW.gravity_score := calculate_gravity(
        COALESCE(NEW.priority, 1), 
        NEW.created_at, 
        NEW.avoidance_count
    );
    
    -- Determine Mass Tier
    IF NEW.gravity_score > 100 THEN
        NEW.mass_tier := 'blackhole';
    ELSIF NEW.gravity_score > 50 THEN
        NEW.mass_tier := 'heavy';
    ELSIF NEW.gravity_score > 20 THEN
        NEW.mass_tier := 'medium';
    ELSE
        NEW.mass_tier := 'light';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gravity
BEFORE INSERT OR UPDATE OF priority, avoidance_count
ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_gravity();
