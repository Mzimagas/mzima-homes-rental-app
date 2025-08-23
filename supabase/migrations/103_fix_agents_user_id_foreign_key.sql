-- Fix agents table foreign key constraint to handle user_profiles deletions
-- This migration addresses the foreign key constraint error when deleting user profiles

-- First, check if the agents table exists and has the problematic constraint
DO $$
BEGIN
    -- Drop the existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'agents_user_id_fkey' 
        AND table_name = 'agents'
    ) THEN
        ALTER TABLE agents DROP CONSTRAINT agents_user_id_fkey;
        RAISE NOTICE 'Dropped existing agents_user_id_fkey constraint';
    END IF;
    
    -- Also check for any other user_id foreign key constraints on agents table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'agents' 
        AND kcu.column_name = 'user_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Get the constraint name and drop it
        FOR constraint_rec IN 
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'agents' 
            AND kcu.column_name = 'user_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
            EXECUTE 'ALTER TABLE agents DROP CONSTRAINT ' || constraint_rec.constraint_name;
            RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
        END LOOP;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping constraints: %', SQLERRM;
END $$;

-- Now add the new foreign key constraint with proper ON DELETE behavior
-- We'll use SET NULL so that when a user_profile is deleted, the agent record remains
-- but the user_id is set to NULL (agent becomes unlinked from user account)
DO $$
BEGIN
    -- Only add the constraint if the agents table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
        -- Add the new foreign key constraint with SET NULL on delete
        ALTER TABLE agents 
        ADD CONSTRAINT agents_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES user_profiles(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Added new agents_user_id_fkey constraint with ON DELETE SET NULL';
        
        -- Also ensure the user_id column allows NULL values
        ALTER TABLE agents ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'Made agents.user_id column nullable';
        
    ELSE
        RAISE NOTICE 'Agents table does not exist, skipping constraint creation';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding new constraint: %', SQLERRM;
END $$;

-- Add a comment to document the change
COMMENT ON CONSTRAINT agents_user_id_fkey ON agents IS 
'Foreign key to user_profiles with SET NULL on delete - allows agent records to persist when user accounts are deleted';

-- Optional: Add an index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id) WHERE user_id IS NOT NULL;

-- Add a trigger to log when agents are orphaned (user_id set to NULL)
CREATE OR REPLACE FUNCTION log_agent_user_orphaned()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when an agent's user_id is set to NULL due to user deletion
    IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
        INSERT INTO activities_audit (
            actor_id,
            entity_type,
            entity_id,
            action,
            description,
            before_snapshot,
            after_snapshot
        ) VALUES (
            NULL, -- No specific actor for cascaded deletions
            'agents',
            NEW.agent_id::text,
            'user_account_deleted',
            'Agent user account was deleted, agent record preserved with NULL user_id',
            jsonb_build_object('user_id', OLD.user_id),
            jsonb_build_object('user_id', NEW.user_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if the agents table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
        DROP TRIGGER IF EXISTS trigger_log_agent_user_orphaned ON agents;
        CREATE TRIGGER trigger_log_agent_user_orphaned
            AFTER UPDATE ON agents
            FOR EACH ROW
            EXECUTE FUNCTION log_agent_user_orphaned();
        RAISE NOTICE 'Created trigger to log agent user orphaning';
    END IF;
END $$;
