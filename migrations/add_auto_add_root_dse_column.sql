-- Add autoAddRootDSE column to dynamic_group_rules table
ALTER TABLE dynamic_group_rules ADD COLUMN IF NOT EXISTS auto_add_root_dse BOOLEAN DEFAULT TRUE;

-- Update existing records to set autoAddRootDSE to TRUE for better user experience
UPDATE dynamic_group_rules SET auto_add_root_dse = TRUE WHERE auto_add_root_dse IS NULL;

-- Change the defaults for create_group_if_not_exists and create_ou_if_not_exists to TRUE
ALTER TABLE dynamic_group_rules ALTER COLUMN create_group_if_not_exists SET DEFAULT TRUE;
ALTER TABLE dynamic_group_rules ALTER COLUMN create_ou_if_not_exists SET DEFAULT TRUE;