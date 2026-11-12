import { ArrowDown, ArrowUp, Plus, Quote, Search, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { MAX_LENGTH } from '../../../../lib/limits.ts'
import {
  INTERVAL_OPTIONS,
  type QuoteOrder,
} from '../../../../state/quoteLibrary.ts'
import { useQuoteLibrary } from '../../../../state/useQuoteLibrary.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { Switch } from '../../components/Switch.tsx'

type Filter = 'all' | 'mine' | 'builtin' | 'hidden'

/** Rotation, order, your own quotes, and the full list to show, hide and arrange. */
export function QuoteSettings({ id }: { id: string }) {
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
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const mine = library.items.filter((i) => !i.builtIn).length
  const shownCount = library.items.filter(
    (i) => i.enabled && (!i.builtIn || library.includeBuiltIn),
  ).length

  function submit(event: FormEvent) {
    event.preventDefault()
    const quote = text.trim().replace(/^["“]|["”]$/g, '')
    if (!quote) return setError('Write the quote first.')
    addQuote(quote, author.trim() || 'Unknown')
    setText('')
    setAuthor('')
    setError('')
  }

  const q = query.trim().toLowerCase()
  const items = library.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (filter === 'mine' && item.builtIn) return false
      if (filter === 'builtin' && !item.builtIn) return false
      if (filter === 'hidden' && item.enabled) return false
      return !q || `${item.text} ${item.author}`.toLowerCase().includes(q)
    })

  return (
    <Card
      id={id}
      icon={<Quote size={16} />}
      title="Quotes"
      subtitle={`${shownCount} in rotation · ${mine} of your own`}
    >
      <Switch
        id="setting-quote-rotate"
        label="Rotate automatically"
        hint="Pauses while the pointer is over the quote."
        checked={library.rotate}
        onChange={(rotate) => updateLibrary({ rotate })}
      />
      <AnimatePresence initial={false}>
        {library.rotate && (
          <motion.div
            className="field-row"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <span className="field-row__label">Change every</span>
            <select
              className="select"
              value={library.intervalSec}
              onChange={(e) =>
                updateLibrary({ intervalSec: Number(e.target.value) })
              }
              aria-label="Rotation interval"
            >
              {INTERVAL_OPTIONS.map(({ seconds, label }) => (
                <option key={seconds} value={seconds}>
                  {label}
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="field-row">
        <div>
          <p className="field-row__label">Order</p>
          <p className="field-row__hint">“My order” follows the list below.</p>
        </div>
        <Segmented<QuoteOrder>
          label="Quote order"
          value={library.order}
          onChange={(order) => updateLibrary({ order })}
          options={[
            { value: 'shuffle', label: 'Shuffle' },
            { value: 'custom', label: 'My order' },
          ]}
        />
      </div>
      <Switch
        id="setting-quote-builtin"
        label="Include the built-in quotes"
        hint={`${library.items.length - mine} built-in quotes`}
        checked={library.includeBuiltIn}
        onChange={(includeBuiltIn) => updateLibrary({ includeBuiltIn })}
      />

      <form className="quote-add" onSubmit={submit}>
        <textarea
          className="input quote-add__text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a quote of your own…"
          aria-label="Quote"
          maxLength={MAX_LENGTH.quote}
          rows={2}
        />
        <div className="quote-add__row">
          <input
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            aria-label="Author"
            maxLength={MAX_LENGTH.author}
          />
          <Button type="submit" variant="primary" icon={<Plus size={16} />}>
            Add quote
          </Button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </form>

      <div className="list-tools">
        <Segmented<Filter>
          label="Show quotes"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'mine', label: 'Mine' },
            { value: 'builtin', label: 'Built-in' },
            { value: 'hidden', label: 'Hidden' },
          ]}
        />
        <label className="search">
          <Search size={15} aria-hidden="true" />
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search quotes"
          />
        </label>
      </div>

      <ol className="qlist scroll" aria-label="Quote list">
        {items.length === 0 && <li className="empty">No quotes match.</li>}
        {items.map(({ item, index }) => {
          const excluded = item.builtIn && !library.includeBuiltIn
          return (
            <motion.li
              key={item.id}
              layout="position"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className={`qlist__item ${excluded ? 'is-excluded' : ''}`}
            >
              <input
                type="checkbox"
                className="qlist__check"
                checked={item.enabled}
                onChange={(e) => setEnabled(item.id, e.target.checked)}
                aria-label={`Show “${item.text}”`}
              />
              <div className="qlist__text">
                <p>{item.text}</p>
                <span>
                  — {item.author}
                  {!item.builtIn && <em className="chip chip--accent">mine</em>}
                </span>
              </div>
              <div className="qlist__actions">
                <IconButton
                  label={`Move “${item.text}” up`}
                  size="sm"
                  onClick={() => moveQuote(item.id, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton
                  label={`Move “${item.text}” down`}
                  size="sm"
                  onClick={() => moveQuote(item.id, 1)}
                  disabled={index === library.items.length - 1}
                >
                  <ArrowDown size={14} />
                </IconButton>
                {!item.builtIn && (
                  <IconButton
                    label={`Delete “${item.text}”`}
                    size="sm"
                    className="task__delete"
                    onClick={() => removeQuote(item.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                )}
              </div>
            </motion.li>
          )
        })}
      </ol>
    </Card>
  )
}
