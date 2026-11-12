import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Columns2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { usePhotoPicker } from '../../../../hooks/usePhotoPicker.tsx'
import {
  formatDayShort,
  parseDateKey,
  type DateKey,
} from '../../../../lib/date.ts'
import {
  formatWeight,
  slidesOf,
  type Slide,
  type WeightUnit,
} from '../../../../lib/weight.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import { Thumb } from '../../components/Thumb.tsx'
import { CompareSheet } from './CompareSheet.tsx'

const PAGE = 24

interface PhotoGalleryProps {
  today: DateKey
  unit: WeightUnit
}

/** Progress photos by month, newest first, with a viewer and a before/after compare. */
export function PhotoGallery({ today, unit }: PhotoGalleryProps) {
  const { log } = useWeights()
  const picker = usePhotoPicker()
  const slides = slidesOf(log).reverse()
  const [limit, setLimit] = useState(PAGE)
  const [viewing, setViewing] = useState<number | null>(null)
  const [comparing, setComparing] = useState(false)

  const shown = slides.slice(0, limit)
  const months: { label: string; items: { slide: Slide; index: number }[] }[] =
    []
  shown.forEach((slide, index) => {
    const label = parseDateKey(slide.date).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    })
    const last = months.at(-1)
    if (last?.label === label) last.items.push({ slide, index })
    else months.push({ label, items: [{ slide, index }] })
  })

  return (
    <Card
      icon={<Camera size={16} />}
      title="Progress photos"
      subtitle={`${slides.length} ${slides.length === 1 ? 'photo' : 'photos'}`}
      action={
        <>
          {slides.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparing(true)}
            >
              <Columns2 size={15} /> Compare
            </Button>
          )}
          <Button
            variant="soft"
            size="sm"
            onClick={() => picker.add(today)}
            disabled={picker.busy || picker.room(today) === 0}
          >
            <Camera size={15} /> {picker.busy ? picker.status : 'Add today'}
          </Button>
        </>
      }
    >
      {picker.input}
      {picker.error && <p className="field-error">{picker.error}</p>}
      {slides.length === 0 ? (
        <p className="empty">
          No photos yet. A photo every week or two makes changes easy to see.
        </p>
      ) : (
        <>
          {months.map((month) => (
            <section key={month.label} className="gallery__month">
              <h3 className="gallery__label">{month.label}</h3>
              <div className="gallery">
                {month.items.map(({ slide, index }) => (
                  <motion.button
                    key={slide.photo}
                    type="button"
                    className="gallery__item"
                    onClick={() => setViewing(index)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    aria-label={`Photo from ${formatDayShort(slide.date)}`}
                  >
                    <Thumb photo={slide.photo} alt="" />
                    <span className="gallery__date">
                      {parseDateKey(slide.date).getDate()}
                      {log[slide.date]?.kg != null && (
                        <em className="num">
                          {formatWeight(log[slide.date].kg!, unit)}
                        </em>
                      )}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          ))}
          {slides.length > limit && (
            <Button
              variant="secondary"
              className="gallery__more"
              onClick={() => setLimit((l) => l + PAGE)}
            >
              Show more ({slides.length - limit})
            </Button>
          )}
        </>
      )}

      <Lightbox
        slides={slides}
        index={viewing}
        onIndex={setViewing}
        unit={unit}
      />
      <CompareSheet
        open={comparing}
        onClose={() => setComparing(false)}
        slides={slides}
        unit={unit}
      />
    </Card>
  )
}

interface LightboxProps {
  slides: Slide[]
  index: number | null
  onIndex: (index: number | null) => void
  unit: WeightUnit
}

function Lightbox({ slides, index, onIndex, unit }: LightboxProps) {
  const { log, removePhoto } = useWeights()
  const picker = usePhotoPicker()
  const [confirm, setConfirm] = useState(false)
  const [direction, setDirection] = useState(0)
  const slide = index === null ? null : slides[index]
  const open = slide !== null && slide !== undefined

  const go = (by: number) => {
    if (index === null) return
    const next = index + by
    if (next < 0 || next >= slides.length) return
    setDirection(by)
    setConfirm(false)
    onIndex(next)
  }

  // ←/→ step through photos (newest first, so → is older).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Deleting the last photo closes; otherwise stay in range.
  useEffect(() => {
    if (index !== null && index >= slides.length)
      onIndex(slides.length ? slides.length - 1 : null)
  }, [index, slides.length, onIndex])

  const kg = slide ? log[slide.date]?.kg : null

  return (
    <Sheet
      open={open}
      onClose={() => {
        setConfirm(false)
        onIndex(null)
      }}
      wide
      title={slide ? formatDayShort(slide.date) : ''}
      description={
        slide
          ? `${kg != null ? formatWeight(kg, unit) + ' · ' : ''}${index! + 1} of ${slides.length}`
          : undefined
      }
      footer={
        slide && (
          <>
            {picker.input}
            <Button
              variant={confirm ? 'danger' : 'ghost'}
              icon={<Trash2 size={15} />}
              onClick={() => {
                if (!confirm) return setConfirm(true)
                setConfirm(false)
                void removePhoto(slide.date, slide.photo)
              }}
            >
              {confirm ? 'Delete this photo?' : 'Delete'}
            </Button>
            <Button
              icon={<RefreshCw size={15} />}
              onClick={() => picker.replace(slide.date, slide.photo)}
              disabled={picker.busy}
            >
              {picker.busy ? picker.status : 'Replace'}
            </Button>
          </>
        )
      }
    >
      {slide && (
        <div className="lightbox">
          <IconButton
            label="Newer photo"
            variant="secondary"
            className="lightbox__nav lightbox__nav--prev"
            onClick={() => go(-1)}
            disabled={index === 0}
          >
            <ChevronLeft size={20} />
          </IconButton>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={slide.photo}
              className="lightbox__frame"
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25 }}
            >
              <Thumb
                photo={slide.photo}
                size="full"
                alt={`Photo from ${formatDayShort(slide.date)}`}
                className="thumb--contain"
              />
            </motion.div>
          </AnimatePresence>
          <IconButton
            label="Older photo"
            variant="secondary"
            className="lightbox__nav lightbox__nav--next"
            onClick={() => go(1)}
            disabled={index === slides.length - 1}
          >
            <ChevronRight size={20} />
          </IconButton>
          {picker.error && <p className="field-error">{picker.error}</p>}
        </div>
      )}
    </Sheet>
  )
}
