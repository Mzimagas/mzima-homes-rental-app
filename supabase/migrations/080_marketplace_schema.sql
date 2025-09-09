-- Migration: Marketplace Schema
-- Description: Database schema for client-facing marketplace functionality

-- Create clients table for marketplace users
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Registration context
  registration_source TEXT DEFAULT 'marketplace', -- 'marketplace', 'admin', 'referral'
  registration_context JSONB DEFAULT '{}', -- Store property interest context
  
  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create client property interests table
CREATE TABLE IF NOT EXISTS client_property_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Interest details
  interest_type TEXT NOT NULL DEFAULT 'express-interest' CHECK (
    interest_type IN ('express-interest', 'contact', 'purchase-inquiry', 'viewing-request')
  ),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'CONVERTED')),
  
  -- Communication preferences
  contact_preference TEXT DEFAULT 'email' CHECK (
    contact_preference IN ('email', 'phone', 'both')
  ),
  message TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(client_id, property_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create handover requests table for purchase inquiries
CREATE TABLE IF NOT EXISTS handover_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (
    status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Notes and metadata
  notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification details
  type TEXT NOT NULL CHECK (
    type IN ('CLIENT_INTEREST', 'HANDOVER_REQUEST', 'CLIENT_REGISTRATION', 'SYSTEM_ALERT')
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related data
  data JSONB DEFAULT '{}',
  
  -- Status and priority
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

CREATE INDEX IF NOT EXISTS idx_client_property_interests_client_id ON client_property_interests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_property_interests_property_id ON client_property_interests(property_id);
CREATE INDEX IF NOT EXISTS idx_client_property_interests_status ON client_property_interests(status);
CREATE INDEX IF NOT EXISTS idx_client_property_interests_created_at ON client_property_interests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_handover_requests_property_id ON handover_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_handover_requests_client_id ON handover_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_handover_requests_status ON handover_requests(status);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- Add RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_property_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Clients can only see their own data
CREATE POLICY "Clients can view own data" ON clients
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Clients can update own data" ON clients
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Client property interests policies
CREATE POLICY "Clients can view own interests" ON client_property_interests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_property_interests.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert own interests" ON client_property_interests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_property_interests.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own interests" ON client_property_interests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_property_interests.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Handover requests policies
CREATE POLICY "Clients can view own handover requests" ON handover_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = handover_requests.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert own handover requests" ON handover_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = handover_requests.client_id
      AND clients.auth_user_id = auth.uid()
    )
  );

-- Admin notifications policies (simplified for now)
CREATE POLICY "Admin can manage notifications" ON admin_notifications
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create functions for automatic client creation
CREATE OR REPLACE FUNCTION create_client_from_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create client record if user has specific metadata indicating marketplace registration
  IF NEW.raw_user_meta_data->>'client_registration' = 'true' THEN
    INSERT INTO clients (
      auth_user_id,
      full_name,
      email,
      phone,
      registration_source,
      registration_context
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      NEW.phone,
      COALESCE(NEW.raw_user_meta_data->>'registration_source', 'marketplace'),
      COALESCE(NEW.raw_user_meta_data::jsonb, '{}')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic client creation
DROP TRIGGER IF EXISTS on_auth_user_created_create_client ON auth.users;
CREATE TRIGGER on_auth_user_created_create_client
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_client_from_auth_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_property_interests_updated_at
  BEFORE UPDATE ON client_property_interests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_handover_requests_updated_at
  BEFORE UPDATE ON handover_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 080: Marketplace schema created successfully';
  RAISE NOTICE 'Created tables: clients, client_property_interests, handover_requests, admin_notifications';
  RAISE NOTICE 'Created indexes and RLS policies for marketplace functionality';
  RAISE NOTICE 'Marketplace functionality ready for implementation';
END $$;
