import VehicleCard from './VehicleCard'

export default function VehicleGrid({ vehicles, onPurchase, purchasingId = null }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          onPurchase={onPurchase}
          isPurchasing={purchasingId === vehicle.id}
        />
      ))}
    </div>
  )
}
