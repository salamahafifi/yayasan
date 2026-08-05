-- Web form uploads JPEG/PNG/WebP into the private staff bucket. Without an
-- explicit allow-list some projects inherit a restrictive default and the
-- edge function upload fails silently — leaving Resident photos empty.

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'ticket-photos';
