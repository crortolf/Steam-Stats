import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Game } from '@/lib/mock-data'

export function GameCapsule({
  game,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 320px',
}: {
  game: Game
  className?: string
  priority?: boolean
  sizes?: string
}) {
  return (
    <div className={cn('relative aspect-[460/215] w-full overflow-hidden rounded-md', className)}>
      <Image
        src={game.capsule || '/placeholder.svg'}
        alt={`${game.title} cover art`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  )
}
