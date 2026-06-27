import type { SyntheticEvent } from 'react'

const AVATAR_COUNT = 10

export const DEFAULT_AVATAR_SRC = '/avatars/avatar-1.png'

function hashKey(value: string): number {
  return Array.from(value || 'default').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) | 0
  }, 0)
}

export function avatarSrcFromKey(key = 'default'): string {
  const index = Math.abs(hashKey(key)) % AVATAR_COUNT
  return `/avatars/avatar-${index + 1}.png`
}

function isUnstableAvatarSource(src: string): boolean {
  return src.includes('i.pravatar.cc')
}

export function resolveAvatarSrc(src?: string | null, fallbackKey = 'default'): string {
  const value = src?.trim()
  if (!value || isUnstableAvatarSource(value)) {
    return avatarSrcFromKey(fallbackKey)
  }
  return value
}

export function handleAvatarError(
  event: SyntheticEvent<HTMLImageElement>,
  fallbackKey = 'default',
): void {
  const image = event.currentTarget
  if (image.dataset.avatarFallbackApplied === 'true') return
  image.dataset.avatarFallbackApplied = 'true'
  image.src = avatarSrcFromKey(fallbackKey)
}
