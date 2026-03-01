-- Add new enum values for app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'rider';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'customer';