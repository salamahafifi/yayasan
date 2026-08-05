import { useAduanForm } from '../../context/AduanFormContext';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import PhotoUpload from '../../components/PhotoUpload';
import VoiceNoteRecorder from '../../components/VoiceNoteRecorder';
import { t, type Lang } from '../../i18n';

type Props = {
  lang: Lang;
  errorId?: string;
  hasError?: boolean;
};

export default function StepDetails({ lang, errorId, hasError }: Props) {
  const { data, update } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLHeadingElement>(3);
  const fieldId = 'aduan-description';
  const preferVoiceId = 'aduan-prefer-voice';
  const noPhotosId = 'aduan-no-photos';

  const descriptionOptional = data.preferVoiceNote;

  return (
    <div className="aduan-step__content">
      <h2 ref={headingRef} tabIndex={-1} className="aduan-step__heading">
        {t(lang, 'step3Heading')}
      </h2>

      <div className="field">
        <label className="field__label" htmlFor={fieldId}>
          {t(lang, 'step3Label')}
          {descriptionOptional && (
            <span className="field__optional"> ({t(lang, 'nameOptional')})</span>
          )}
        </label>
        <textarea
          id={fieldId}
          className="field__input field__textarea"
          rows={6}
          maxLength={2000}
          required={!descriptionOptional}
          value={data.description}
          onChange={(e) => update({ description: e.target.value.slice(0, 2000) })}
          placeholder={t(lang, 'step3Placeholder')}
          aria-describedby={hasError && errorId ? errorId : undefined}
        />
        <span className="field__hint" aria-live="polite">
          {t(lang, 'charCounter', { count: data.description.length })}
        </span>

        <div className="consent-field consent-field--inline">
          <label className="consent-field__label" htmlFor={preferVoiceId}>
            <input
              id={preferVoiceId}
              type="checkbox"
              className="consent-field__input"
              checked={data.preferVoiceNote}
              onChange={(e) => update({ preferVoiceNote: e.target.checked })}
            />
            <span>{t(lang, 'preferVoiceNote')}</span>
          </label>
        </div>
      </div>

      <VoiceNoteRecorder
        lang={lang}
        value={data.voiceNote}
        onChange={(voiceNote) => update({ voiceNote })}
      />

      <PhotoUpload
        lang={lang}
        value={data.photos}
        optedOut={data.noPhotos}
        onChange={(photos) =>
          update({
            photos,
            // Attaching a photo cancels the "no photos" opt-out.
            noPhotos: photos.length > 0 ? false : data.noPhotos,
          })
        }
      />

      <div className="consent-field consent-field--inline">
        <label className="consent-field__label" htmlFor={noPhotosId}>
          <input
            id={noPhotosId}
            type="checkbox"
            className="consent-field__input"
            checked={data.noPhotos}
            onChange={(e) => {
              const checked = e.target.checked;
              update({
                noPhotos: checked,
                // Opting out clears any photos already picked.
                photos: checked ? [] : data.photos,
              });
            }}
          />
          <span>{t(lang, 'noPhotos')}</span>
        </label>
      </div>
    </div>
  );
}
