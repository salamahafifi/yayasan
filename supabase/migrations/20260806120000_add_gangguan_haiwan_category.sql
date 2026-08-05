-- Add MyAduan Johor animal-nuisance category. Enum keys stay snake_case;
-- display wording lives in the frontend only.
ALTER TYPE public.issue_category ADD VALUE IF NOT EXISTS 'gangguan_haiwan';
