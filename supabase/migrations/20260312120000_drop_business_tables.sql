-- Drop business wallet tables (feature removed)
-- Order: activity → proposals → members → businesses (respect FK constraints)

DROP TABLE IF EXISTS business_activity CASCADE;
DROP TABLE IF EXISTS business_proposals CASCADE;
DROP TABLE IF EXISTS business_members CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
