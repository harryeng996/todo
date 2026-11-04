import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MAX_LENGTH } from '../../lib/limits.ts'
import { INTERVAL_OPTIONS, type QuoteOrder } from '../../state/quoteLibrary.ts'
import { useQuoteLibrary } from '../../state/useQuoteLibrary.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchCheckbox } from '../sketch/SketchCheckbox.tsx'
import { SketchInput } from '../sketch/SketchInput.tsx'
import { SettingsToggle } from './SettingsToggle.tsx'

const icon = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

const ORDERS: { value: QuoteOrder; label: string }[] = [
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'custom', label: 'My order' },
]

/** Rotation, order and the quote list: add your own, hide, arrange, delete. */
export function QuoteSettings() {
  const {
    library,
    addQuote,
    removeQuote,
    setEnabled,
    moveQuote,
    updateLibrary,
  } = useQuoteLibrary()
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState('')
  const mineCount = library.items.filter((item) => !item.builtIn).length

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const quote = text.trim().replace(/^["“]|["”]$/g, '')
    if (!quote) {
      setError('Write the quote first.')
      return
    }
    addQuote(quote, author.trim() || 'Unknown')
    setText('')
    setAuthor('')
    setError('')
  }

  return (
    <fieldset className="settings__group" id="settings-quotes">
      <legend className="visually-hidden">Quotes</legend>

      <SettingsToggle
        id="setting-quote-rotate"
        label="Rotate automatically"
        hint="Pauses while the pointer is over the quote."
        checked={library.rotate}
        onChange={(rotate) => updateLibrary({ rotate })}
      />
      {library.rotate && (
        <label className="settings__inline">
          Every
          <select
            className="settings__select sketch-border--alt"
            value={library.intervalSec}
            onChange={(event) =>
              updateLibrary({ intervalSec: Number(event.target.value) })
            }
          >
            {INTERVAL_OPTIONS.map(({ seconds, label }) => (
              <option key={seconds} value={seconds}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div
        className="settings__unit"
        role="radiogroup"
        aria-label="Quote order"
      >
        {ORDERS.map(({ value, label }) => (
          <label key={value} className="settings__radio">
            <input
              type="radio"
              name="quote-order"
              value={value}
              checked={library.order === value}
              onChange={() => updateLibrary({ order: value })}
            />
            {label}
          </label>
        ))}
      </div>

      <SettingsToggle
        id="setting-quote-builtin"
        label="Include the built-in quotes"
        hint={`${library.items.length - mineCount} built-in · ${mineCount} of your own`}
        checked={library.includeBuiltIn}
        onChange={(includeBuiltIn) => updateLibrary({ includeBuiltIn })}
      />

      <p className="settings__hint">
        Tick to show a quote; ↑ ↓ arrange the list (
        {library.order === 'custom' ? 'used now' : 'used with "My order"'}).
      </p>
      <ol className="quote-list sketch-scroll" aria-label="Quote list">
        {library.items.map((item, index) => {
          const excluded = item.builtIn && !library.includeBuiltIn
          return (
            <li
              key={item.id}
              className={
                excluded
                  ? 'quote-list__item quote-list__item--excluded'
                  : 'quote-list__item'
              }
            >
              <SketchCheckbox
                checked={item.enabled}
                onChange={(enabled) => setEnabled(item.id, enabled)}
                label={`Show "${item.text}"`}
                seed={index + 300}
              />
              <span className="quote-list__text">
                {item.text}{' '}
                <span className="quote-list__author">— {item.author}</span>
                {!item.builtIn && (
                  <span className="quote-list__mine">mine</span>
                )}
              </span>
              <span className="quote-list__actions">
                <SketchButton
                  variant="ghost"
                  onClick={() => moveQuote(item.id, -1)}
                  disabled={index === 0}
                  aria-label={`Move "${item.text}" up`}
                >
                  <ArrowUp {...icon} />
                </SketchButton>
                <SketchButton
                  variant="ghost"
                  onClick={() => moveQuote(item.id, 1)}
                  disabled={index === library.items.length - 1}
                  aria-label={`Move "${item.text}" down`}
                >
                  <ArrowDown {...icon} />
                </SketchButton>
                {!item.builtIn && (
                  <SketchButton
                    variant="ghost"
                    className="quote-list__delete"
                    onClick={() => removeQuote(item.id)}
                    aria-label={`Delete "${item.text}"`}
                  >
                    <Trash2 {...icon} />
                  </SketchButton>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      <form className="quote-form" onSubmit={handleSubmit} noValidate>
        <SketchInput
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Your quote"
          maxLength={MAX_LENGTH.quote}
          aria-label="New quote"
        />
        <div className="quote-form__row">
          <SketchInput
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Author (optional)"
            maxLength={MAX_LENGTH.author}
            aria-label="Quote author"
          />
          <SketchButton type="submit" variant="primary">
            <Plus {...icon} />
            Add quote
          </SketchButton>
        </div>
        {error && (
          <p className="quote-form__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </fieldset>
  )
}
