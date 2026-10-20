-- Scenario E: Migration introducing breaking schema drift
-- Dropping legacy column and audit table
ALTER TABLE students DROP COLUMN legacy_phone;
DROP TABLE old_audit_logs;
