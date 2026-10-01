-- Removes the legacy foreign keys that used to link invoices/payments to
-- subscribers. Those relations no longer exist in the models: subscriber data
-- moved from the `subscribers` table to `connections`.
--
-- Safe to run repeatedly. Matches constraints from pg_constraint instead of
-- hardcoding names, because the constraints created on the server are named
-- fk_invoices_subscribers / fk_payments_subscribers (plural) while the app used
-- to drop fk_invoices_subscriber / fk_payments_subscriber (singular).
--
-- This only drops constraints. It deletes no rows.
DO $$
DECLARE
	r record;
BEGIN
	FOR r IN
		SELECT con.conrelid::regclass::text AS table_name, con.conname
		FROM pg_constraint con
		JOIN pg_class rel ON rel.oid = con.conrelid
		JOIN pg_namespace ns ON ns.oid = rel.relnamespace
		WHERE con.contype = 'f'
			AND ns.nspname = 'public'
			AND rel.relname IN ('invoices', 'payments')
			AND con.confrelid IN (
				SELECT c.oid
				FROM pg_class c
				JOIN pg_namespace n2 ON n2.oid = c.relnamespace
				WHERE c.relname IN ('subscribers', 'invoices')
					AND n2.nspname = 'public'
			)
	LOOP
		EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
		RAISE NOTICE 'dropped leftover FK % -> %', r.table_name, r.conname;
	END LOOP;
END $$;

-- Keep the columns nullable, matching models/billing.go where SubscriberID on
-- Payment is a *uuid.UUID and invoices may carry the zero UUID.
ALTER TABLE invoices ALTER COLUMN subscriber_id DROP NOT NULL;
ALTER TABLE payments  ALTER COLUMN subscriber_id DROP NOT NULL;
ALTER TABLE payments  ALTER COLUMN invoice_id    DROP NOT NULL;
