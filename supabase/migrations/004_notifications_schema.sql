-- Migration 004: Notifications System Schema
-- Create tables for comprehensive notification management

-- Notification Rules Table
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES landlords(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rent_due', 'payment_overdue', 'lease_expiring', 'maintenance_due', 'custom')),
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  trigger_days INTEGER DEFAULT 0,
  channels TEXT[] DEFAULT ARRAY['email'],
  template_id UUID,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES landlords(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rent_due', 'payment_overdue', 'lease_expiring', 'maintenance_due', 'custom')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  subject TEXT,
  message TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification History Table
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  landlord_id UUID REFERENCES landlords(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('tenant', 'landlord', 'admin')),
  recipient_id UUID NOT NULL,
  recipient_contact TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES landlords(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  email_smtp_host TEXT DEFAULT 'smtp.gmail.com',
  email_smtp_port INTEGER DEFAULT 587,
  email_smtp_username TEXT,
  email_smtp_password TEXT,
  email_from_email TEXT DEFAULT 'noreply@example.com',
  email_from_name TEXT DEFAULT 'Rental Management',
  sms_enabled BOOLEAN DEFAULT false,
  sms_provider TEXT DEFAULT 'africastalking' CHECK (sms_provider IN ('twilio', 'africastalking', 'custom')),
  sms_api_key TEXT,
  sms_api_secret TEXT,
  sms_sender_id TEXT DEFAULT 'RENTAL',
  timezone TEXT DEFAULT 'Africa/Nairobi',
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '18:00',
  send_during_business_hours_only BOOLEAN DEFAULT false,
  max_retries INTEGER DEFAULT 3,
  retry_interval_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- In-App Notifications Table
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_rules_landlord_id ON notification_rules(landlord_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON notification_rules(type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON notification_rules(enabled);

CREATE INDEX IF NOT EXISTS idx_notification_templates_landlord_id ON notification_templates(landlord_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);

CREATE INDEX IF NOT EXISTS idx_notification_history_landlord_id ON notification_history(landlord_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(type);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_settings_landlord_id ON notification_settings(landlord_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON in_app_notifications(created_at);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_rules_updated_at BEFORE UPDATE ON notification_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_rules
CREATE POLICY "Landlords can manage their notification rules" ON notification_rules
  FOR ALL USING (landlord_id = auth.uid());

-- RLS Policies for notification_templates
CREATE POLICY "Landlords can manage their notification templates" ON notification_templates
  FOR ALL USING (landlord_id = auth.uid());

-- RLS Policies for notification_history
CREATE POLICY "Landlords can view their notification history" ON notification_history
  FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "System can insert notification history" ON notification_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update notification history" ON notification_history
  FOR UPDATE USING (true);

-- RLS Policies for notification_settings
CREATE POLICY "Landlords can manage their notification settings" ON notification_settings
  FOR ALL USING (landlord_id = auth.uid());

-- RLS Policies for in_app_notifications
CREATE POLICY "Users can view their in-app notifications" ON in_app_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their in-app notifications" ON in_app_notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert in-app notifications" ON in_app_notifications
  FOR INSERT WITH CHECK (true);

-- Insert default notification templates
INSERT INTO notification_templates (landlord_id, name, type, channel, subject, message, variables, is_default) VALUES
  (NULL, 'Default Rent Due Email', 'rent_due', 'email', 'Rent Payment Reminder - {{property_name}} {{unit_label}}',
   'Dear {{tenant_name}},

This is a friendly reminder that your rent payment for {{property_name}}, Unit {{unit_label}} is due on {{due_date}}.

Amount Due: KES {{amount_due}}
Payment Methods:
- M-Pesa: {{mpesa_number}}
- Bank Transfer: {{bank_details}}

Please ensure payment is made by the due date to avoid late fees.

Thank you,
{{landlord_name}}',
   ARRAY['tenant_name', 'property_name', 'unit_label', 'due_date', 'amount_due', 'mpesa_number', 'bank_details', 'landlord_name'],
   true),

  (NULL, 'Default Payment Overdue Email', 'payment_overdue', 'email', 'URGENT: Overdue Payment - {{property_name}} {{unit_label}}',
   'Dear {{tenant_name}},

Your rent payment for {{property_name}}, Unit {{unit_label}} is now {{days_overdue}} days overdue.

Original Due Date: {{due_date}}
Amount Due: KES {{amount_due}}
Late Fee: KES {{late_fee}}
Total Amount: KES {{total_amount}}

Please make payment immediately to avoid further action.

Payment Methods:
- M-Pesa: {{mpesa_number}}
- Bank Transfer: {{bank_details}}

Contact us immediately if you need to discuss payment arrangements.

{{landlord_name}}',
   ARRAY['tenant_name', 'property_name', 'unit_label', 'days_overdue', 'due_date', 'amount_due', 'late_fee', 'total_amount', 'mpesa_number', 'bank_details', 'landlord_name'],
   true);

-- Grant necessary permissions
GRANT ALL ON notification_rules TO authenticated;
GRANT ALL ON notification_templates TO authenticated;
GRANT ALL ON notification_history TO authenticated;
GRANT ALL ON notification_settings TO authenticated;
GRANT ALL ON in_app_notifications TO authenticated;
