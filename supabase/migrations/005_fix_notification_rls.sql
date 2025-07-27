-- Migration 005: Fix Notification RLS Policies
-- Update RLS policies to use the correct user-landlord relationship

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Landlords can manage their notification rules" ON notification_rules;
DROP POLICY IF EXISTS "Landlords can manage their notification templates" ON notification_templates;
DROP POLICY IF EXISTS "Landlords can view their notification history" ON notification_history;
DROP POLICY IF EXISTS "Landlords can manage their notification settings" ON notification_settings;

-- Create correct RLS policies using the get_user_landlord_ids function
CREATE POLICY "Users can manage notification rules for their landlords" ON notification_rules
  FOR ALL USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

CREATE POLICY "Users can manage notification templates for their landlords" ON notification_templates
  FOR ALL USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

CREATE POLICY "Users can view notification history for their landlords" ON notification_history
  FOR SELECT USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

CREATE POLICY "Users can manage notification settings for their landlords" ON notification_settings
  FOR ALL USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

-- Keep the existing system policies for notification_history
-- (These allow the system to insert/update notification history)

-- Update the default notification templates to not have a landlord_id
-- (They should be global templates that can be used by any landlord)
UPDATE notification_templates 
SET landlord_id = NULL 
WHERE is_default = true;
