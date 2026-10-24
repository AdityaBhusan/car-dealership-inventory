import { useState } from 'react'
import { BatteryCharging, Car, CarFront, Caravan, Truck } from 'lucide-react'

/**
 * Vehicle imagery. Seed data deliberately ships without image URLs, so the
 * default is a styled placeholder keyed on category rather than a remote image
 * that might 404. A real image_url is used when one is present, and falls back
 * to the placeholder if it fails to load.
 */

const CATEGORY_STYLES = {
  sedan: { gradient: 'from-slate-700 to-slate-900', icon: CarFront },
  suv: { gradient: 'from-slate-600 to-slate-800', icon: Truck },
  hatchback: { gradient: 'from-blue-700 to-slate-900', icon: Car },
  coupe: { gradient: 'from-slate-800 to-blue-900', icon: CarFront },
  electric: { gradient: 'from-emerald-700 to-slate-900', icon: BatteryCharging },
  default: { gradient: 'from-slate-700 to-slate-900', icon: Caravan },
}

function styleFor(category) {
  return CATEGORY_STYLES[String(category || '').toLowerCase()] ?? CATEGORY_STYLES.default
}

export default function VehicleImage({ vehicle, className = 'h-44' }) {
  const [failed, setFailed] = useState(false)
  const { gradient, icon: Icon } = styleFor(vehicle.category)
  const showImage = Boolean(vehicle.image_url) && !failed

  if (showImage) {
    return (
      <img
        src={vehicle.image_url}
        alt={`${vehicle.make} ${vehicle.model}`}
        onError={() => setFailed(true)}
        className={`w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden
                  bg-gradient-to-br ${gradient} ${className}`}
      role="img"
      aria-label={`${vehicle.make} ${vehicle.model} placeholder image`}
    >
      {/* Subtle diagonal sheen so the placeholder does not look like a gap. */}
      <span
        className="absolute -left-8 top-0 h-full w-24 rotate-12 bg-white/5"
        aria-hidden="true"
      />
      <span
        className="absolute -right-4 bottom-0 h-full w-16 -rotate-12 bg-black/10"
        aria-hidden="true"
      />
      <Icon size={48} className="relative text-white/70" strokeWidth={1.25} aria-hidden="true" />
      <span
        className="absolute bottom-2.5 right-3 text-[10px] font-semibold uppercase
                   tracking-widest text-white/50"
        aria-hidden="true"
      >
        {vehicle.category}
      </span>
    </div>
  )
}
