-- Archive status for cases that should leave the active queue without hard-delete.
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'arkib';
