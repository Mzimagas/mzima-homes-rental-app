-- Migration 007: Cron Job History Table
-- Create table to track cron job executions

-- Cron Job History Table
CREATE TABLE IF NOT EXISTS cron_job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'error')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cron_job_history_job_name 
ON cron_job_history(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_job_history_status 
ON cron_job_history(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_job_history_started_at 
ON cron_job_history(started_at DESC);

-- Function to get cron job statistics
CREATE OR REPLACE FUNCTION get_cron_job_stats(
  p_job_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 7
) RETURNS TABLE (
  job_name TEXT,
  total_runs INTEGER,
  successful_runs INTEGER,
  failed_runs INTEGER,
  success_rate DECIMAL,
  last_run TIMESTAMP WITH TIME ZONE,
  last_status TEXT,
  avg_duration_seconds DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cjh.job_name,
    COUNT(*)::INTEGER as total_runs,
    COUNT(CASE WHEN cjh.status = 'completed' THEN 1 END)::INTEGER as successful_runs,
    COUNT(CASE WHEN cjh.status IN ('failed', 'error') THEN 1 END)::INTEGER as failed_runs,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN cjh.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0::DECIMAL
    END as success_rate,
    MAX(cjh.started_at) as last_run,
    (SELECT status FROM cron_job_history WHERE job_name = cjh.job_name ORDER BY started_at DESC LIMIT 1) as last_status,
    CASE 
      WHEN COUNT(CASE WHEN cjh.completed_at IS NOT NULL THEN 1 END) > 0 THEN
        ROUND(AVG(EXTRACT(EPOCH FROM (cjh.completed_at - cjh.started_at)))::DECIMAL, 2)
      ELSE NULL
    END as avg_duration_seconds
  FROM cron_job_history cjh
  WHERE (p_job_name IS NULL OR cjh.job_name = p_job_name)
    AND cjh.started_at >= (NOW() - INTERVAL '1 day' * p_days)
  GROUP BY cjh.job_name
  ORDER BY cjh.job_name;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old cron job history
CREATE OR REPLACE FUNCTION cleanup_cron_job_history(
  p_keep_days INTEGER DEFAULT 30,
  p_keep_count INTEGER DEFAULT 1000
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate cutoff date
  v_cutoff_date := NOW() - INTERVAL '1 day' * p_keep_days;
  
  -- Delete old records, but keep at least p_keep_count most recent records
  WITH records_to_delete AS (
    SELECT id
    FROM cron_job_history
    WHERE started_at < v_cutoff_date
      AND id NOT IN (
        SELECT id
        FROM cron_job_history
        ORDER BY started_at DESC
        LIMIT p_keep_count
      )
  )
  DELETE FROM cron_job_history
  WHERE id IN (SELECT id FROM records_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;
