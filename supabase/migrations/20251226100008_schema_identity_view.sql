create or replace view schema_identity_violations as
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'user_id'
  and data_type = 'uuid';
