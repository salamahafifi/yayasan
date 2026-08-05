import { useEffect, useId, useRef, useState } from 'react';
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  searchPlaces,
  type PhotonSuggestion,
} from '../lib/photon';
import { t, type Lang } from '../i18n';

type SearchResult = {
  /** The query these items answer, so stale results are never shown. */
  query: string;
  items: PhotonSuggestion[];
  failed: boolean;
};

type Props = {
  lang: Lang;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (suggestion: PhotonSuggestion) => void;
  describedBy?: string;
};

export default function AddressAutocomplete({
  lang,
  value,
  onValueChange,
  onSelect,
  describedBy,
}: Props) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const statusId = `${inputId}-status`;

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);

  const query = value.trim();
  const searchable = query.length >= MIN_QUERY_LENGTH;
  const matches = result && result.query === query ? result : null;

  useEffect(() => {
    // No point querying for a list nobody is looking at: this also stops the
    // chosen suggestion's own text from triggering a fresh search.
    if (!searchable || dismissed || matches) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchPlaces(query, controller.signal)
        .then((items) => {
          setResult({ query, items, failed: false });
          setActiveIndex(-1);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setResult({ query, items: [], failed: true });
          setActiveIndex(-1);
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable, dismissed, matches]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setDismissed(true);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const suggestions = matches && !matches.failed ? matches.items : [];
  const showList = searchable && !dismissed && suggestions.length > 0;

  function choose(suggestion: PhotonSuggestion) {
    setDismissed(true);
    setActiveIndex(-1);
    onSelect(suggestion);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDismissed(true);
      return;
    }
    if (!showList) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
  }

  let status = '';
  if (searchable && loading) status = t(lang, 'addressSearching');
  else if (matches?.failed) status = t(lang, 'addressSearchFailed');
  else if (searchable && !dismissed && matches && matches.items.length === 0) {
    status = t(lang, 'addressNoResults');
  }

  return (
    <div className="field address-field" ref={wrapRef}>
      <label className="field__label" htmlFor={inputId}>
        {t(lang, 'addressLabel')}
      </label>

      <div className="address-field__combobox">
        <input
          id={inputId}
          type="text"
          className="field__input"
          value={value}
          onChange={(e) => {
            setDismissed(false);
            onValueChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setDismissed(false)}
          placeholder={t(lang, 'addressPlaceholder')}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          aria-describedby={
            [describedBy, statusId].filter(Boolean).join(' ') || undefined
          }
        />

        {showList && (
          <ul className="address-suggestions" id={listId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`address-suggestions__item${
                  index === activeIndex ? ' address-suggestions__item--active' : ''
                }`}
                // Pointer down fires before the input blurs, so the pick is not
                // lost to the outside-click handler closing the list first.
                onPointerDown={(e) => {
                  e.preventDefault();
                  choose(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="address-suggestions__label">{suggestion.label}</span>
                {suggestion.detail && (
                  <span className="address-suggestions__detail">
                    {suggestion.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p id={statusId} className="field__note" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
