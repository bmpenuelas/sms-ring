export type StorePlatform = 'android' | 'ios'
export type StoreDescriptionLine = string | { android: string; ios?: never } | { ios: string; android?: never }

/** Shared copy stays in sync; platform-only lines never reach the other store. */
export function storeDescription(lines: readonly StoreDescriptionLine[], platform: StorePlatform): string {
  return lines.flatMap((line) => {
    if (typeof line === 'string') return [line]
    const text = line[platform]
    return text === undefined ? [] : [text]
  }).map((line) => platform === 'ios'
    ? line.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '►')
    : line).join('\n')
}
