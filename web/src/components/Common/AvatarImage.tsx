import type { ImgHTMLAttributes } from 'react'
import { handleAvatarError, resolveAvatarSrc } from '../../utils/avatar'

interface AvatarImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  fallbackKey?: string
}

export default function AvatarImage({
  src,
  fallbackKey,
  onError,
  ...props
}: AvatarImageProps) {
  const key = fallbackKey ?? props.alt ?? 'default'

  return (
    <img
      {...props}
      src={resolveAvatarSrc(src, key)}
      onError={event => {
        handleAvatarError(event, key)
        onError?.(event)
      }}
    />
  )
}
