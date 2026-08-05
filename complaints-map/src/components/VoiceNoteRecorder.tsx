import { useEffect, useRef, useState } from 'react';
import type { VoiceNote } from '../context/AduanFormContext';
import {
  MAX_RECORDING_MS,
  MAX_VOICE_NOTE_BYTES,
  formatDuration,
  isVoiceRecordingSupported,
  pickRecordingMime,
} from '../lib/voiceNote';
import { t, type Lang } from '../i18n';

type Props = {
  lang: Lang;
  value: VoiceNote | null;
  onChange: (note: VoiceNote | null) => void;
};

export default function VoiceNoteRecorder({ lang, value, onChange }: Props) {
  const [supported] = useState(isVoiceRecordingSupported);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
    },
    [],
  );

  function cleanupTimers() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (autoStopRef.current) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    const mime = pickRecordingMime();
    if (!mime) {
      setError(t(lang, 'voiceUnsupported'));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t(lang, 'voiceDenied'));
      return;
    }

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    const chunks: BlobPart[] = [];

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    recorder.addEventListener('stop', () => {
      cleanupTimers();
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);

      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunks, { type: mime });
      if (blob.size === 0) {
        setError(t(lang, 'voiceEmpty'));
        return;
      }
      if (blob.size > MAX_VOICE_NOTE_BYTES) {
        setError(t(lang, 'voiceTooLarge'));
        return;
      }
      onChange({ blob, mime, durationMs, url: URL.createObjectURL(blob) });
    });

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    recorder.start();
    setRecording(true);

    tickRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    autoStopRef.current = window.setTimeout(() => {
      recorderRef.current?.stop();
    }, MAX_RECORDING_MS);
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  if (!supported) return null;

  return (
    <div className="voice-note">
      <span className="field__label">{t(lang, 'voiceLabel')}</span>

      {recording ? (
        <button type="button" className="voice-note__record voice-note__record--active" onClick={stopRecording}>
          <span className="voice-note__dot" aria-hidden="true" />
          {t(lang, 'voiceStop', { time: formatDuration(elapsedMs) })}
        </button>
      ) : (
        <button type="button" className="voice-note__record" onClick={() => void startRecording()}>
          {value ? t(lang, 'voiceReRecord') : t(lang, 'voiceRecord')}
        </button>
      )}

      {value && !recording && (
        <div className="voice-note__playback">
          <audio
            controls
            src={value.url}
            className="voice-note__audio"
            aria-label={t(lang, 'voicePlaybackLabel')}
          />
          <button
            type="button"
            className="voice-note__remove"
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            {t(lang, 'voiceRemove')}
          </button>
        </div>
      )}

      <p className="field__error" aria-live="polite">
        {error ?? ''}
      </p>
    </div>
  );
}
