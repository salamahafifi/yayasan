-- Web complaint form can now attach a recorded voice note, so the bucket that
-- previously only received WhatsApp audio needs explicit limits and the mime
-- types browsers actually produce (opus/webm on Android, mp4/aac on iOS).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-voice-notes',
  'ticket-voice-notes',
  false,
  5242880,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
