import React from 'react'

/** Render inline markdown: **bold**, *italic*, `code` */
export function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(React.createElement('strong', { key: match.index, className: 'font-semibold' }, match[2]))
    } else if (match[3]) {
      parts.push(React.createElement('em', { key: match.index }, match[3]))
    } else if (match[4]) {
      parts.push(
        React.createElement('code', {
          key: match.index,
          className: 'px-1.5 py-0.5 rounded bg-white/10 text-[13px] font-mono',
        }, match[4])
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}
