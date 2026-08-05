-- Display only — no schema change.
--
-- MyAduan Johor public labels (complaints-map/src/i18n/strings.ts and map
-- legend). Enum values are unchanged:
--   jalan_berlubang      → Jalan & perabot jalan
--   lampu_jalan          → Lampu jalan & lampu isyarat
--   semak                → Pokok & landskap
--   sampah               → Sampah & pembersihan
--   longkang_tersumbat   → Saliran & perparitan
--   gangguan_haiwan      → Gangguan haiwan
--   lain_lain            → Lain-lain

-- Keep the migration runner happy without altering any objects.
SELECT 1;
