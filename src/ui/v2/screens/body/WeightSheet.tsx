import { ImagePlus, Minus, Plus, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { usePhotoPicker } from '../../../../hooks/usePhotoPicker.tsx'
import { formatDayShort, type DateKey } from '../../../../lib/date.ts'
import { formatDelta } from '../../../../lib/format.ts'
import { MAX_PHOTOS_PER_DAY } from '../../../../lib/limits.ts'
import {
  formatWeight,
  parseWeight,
  toUnit,
  weightComparison,
  type WeightUnit,
} from '../../../../lib/weight.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import { Thumb } from '../../components/Thumb.tsx'
import { useToast } from '../../components/toastContext.ts'

interface WeightSheetProps {
  open: boolean
  date: DateKey
  today: DateKey
  unit: WeightUnit
  onClose: () => void
}

/** Log or edit one day: weight with a stepper, and that day's photos. */
export function WeightSheet(props: WeightSheetProps) {
  // Remount per opening so the form starts from the chosen day.
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title="Log weight"
      description="One entry per day. Photos are kept in this browser."
    >
      {props.open && <WeightForm key={props.date} {...props} />}
    </Sheet>
  )
}

function WeightForm({
  date: initialDate,
  today,
  unit,
  onClose,
}: WeightSheetProps) {
  const { log, setWeight, removePhoto, deleteEntry } = useWeights()
  const toast = useToast()
  const picker = usePhotoPicker()
  const [date, setDate] = useState(initialDate)
  const entry = log[date]
  const before = weightComparison(log, date)
  // The latest weigh-in before this day, as a starting point and for comparison.
  const previous =
    before.current?.date === date ? before.previous : before.current
  const startKg = entry?.kg ?? previous?.kg ?? null
  const [text, setText] = useState(
    startKg === null ? '' : toUnit(startKg, unit).toFixed(1),
  )
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function pickDate(next: DateKey) {
    if (!next || next > today) return
    setDate(next)
    const kg = log[next]?.kg ?? null
    if (kg !== null) setText(toUnit(kg, unit).toFixed(1))
    setError('')
    setConfirmDelete(false)
  }

  function nudge(by: number) {
    const value = Number(text.replace(',', '.'))
    setText((Number.isFinite(value) && text ? value + by : 0).toFixed(1))
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const kg = parseWeight(text, unit)
    if (kg === null) {
      setError(
        `Enter a weight between ${unit === 'kg' ? '20 and 400 kg' : '44 and 882 lb'}.`,
      )
      return
    }
    setWeight(date, kg)
    toast({
      message: `Saved ${formatWeight(kg, unit)} for ${formatDayShort(date)}`,
      tone: 'success',
    })
    onClose()
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await deleteEntry(date)
    toast({ message: `Removed the entry for ${formatDayShort(date)}` })
    onClose()
  }

  const typed = parseWeight(text, unit)
  const diff =
    typed !== null && previous ? toUnit(typed - previous.kg, unit) : null
  const photos = entry?.photos ?? []

  return (
    <form className="weigh" onSubmit={save}>
      {picker.input}
      <label className="weigh__date">
        Day
        <input
          className="input"
          type="date"
          value={date}
          max={today}
          onChange={(e) => pickDate(e.target.value)}
        />
      </label>

      <div className="weigh__dial">
        <IconButton
          label={`Minus 0.1 ${unit}`}
          variant="secondary"
          size="lg"
          onClick={() => nudge(-0.1)}
        >
          <Minus size={20} />
        </IconButton>
        <label className="weigh__value">
          <input
            data-autofocus
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={`Weight in ${unit}`}
            placeholder="0.0"
            className="num"
          />
          <span>{unit}</span>
        </label>
        <IconButton
          label={`Plus 0.1 ${unit}`}
          variant="secondary"
          size="lg"
          onClick={() => nudge(0.1)}
        >
          <Plus size={20} />
        </IconButton>
      </div>
      <p className="weigh__hint">
        {previous ? (
          <>
            Previous {formatWeight(previous.kg, unit)} on{' '}
            {formatDayShort(previous.date)}
            {diff !== null && (
              <strong className="num">
                {' '}
                · {formatDelta(diff)} {unit}
              </strong>
            )}
          </>
        ) : (
          'Your first weigh-in'
        )}
      </p>
      {error && <p className="field-error">{error}</p>}

      <div className="weigh__photos">
        <div className="weigh__photos-head">
          <span>Photos</span>
          <span className="subtle num">
            {photos.length}/{MAX_PHOTOS_PER_DAY}
          </span>
        </div>
        <div className="weigh__grid">
          <AnimatePresence initial={false}>
            {photos.map((photo) => (
              <motion.div
                key={photo}
                className="weigh__photo"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Thumb
                  photo={photo}
                  alt={`Photo from ${formatDayShort(date)}`}
                />
                <button
                  type="button"
                  className="weigh__remove"
                  aria-label="Remove photo"
                  onClick={() => void removePhoto(date, photo)}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {picker.room(date) > 0 && (
            <button
              type="button"
              className="weigh__add"
              onClick={() => picker.add(date)}
              disabled={picker.busy}
            >
              <ImagePlus size={20} />
              <span>{picker.busy ? picker.status : 'Add'}</span>
            </button>
          )}
        </div>
        {picker.error && <p className="field-error">{picker.error}</p>}
      </div>

      <div className="weigh__actions">
        {entry && (
          <Button
            variant={confirmDelete ? 'danger' : 'ghost'}
            onClick={() => void remove()}
            icon={<Trash2 size={15} />}
          >
            {confirmDelete ? 'Delete weight and photos?' : 'Delete'}
          </Button>
        )}
        <span className="weigh__spacer" />
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  )
}
