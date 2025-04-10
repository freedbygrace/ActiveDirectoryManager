-- Add missing columns to dynamic_group_rules table
ALTER TABLE dynamic_group_rules ADD COLUMN IF NOT EXISTS create_group_if_not_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE dynamic_group_rules ADD COLUMN IF NOT EXISTS create_ou_if_not_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE dynamic_group_rules ADD COLUMN IF NOT EXISTS create_group_for_each_attribute_value BOOLEAN DEFAULT FALSE;
ALTER TABLE dynamic_group_rules ADD COLUMN IF NOT EXISTS create_ou_for_each_attribute_value BOOLEAN DEFAULT FALSE;