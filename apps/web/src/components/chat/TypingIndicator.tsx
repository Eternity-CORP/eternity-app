'use client'

import React from 'react'

/** Render inline markdown: **bold**, *italic*, `code` */
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-white/10 text-[13px] font-mono">
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

interface TypingIndicatorProps {
  streamingContent?: string
}

export default function TypingIndicator({ streamingContent }: TypingIndicatorProps) {
  if (streamingContent) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-ai">
          <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
            {renderMarkdown(streamingContent)}
          </div>
          <p className="text-[10px] mt-1.5 text-[#3388FF]/60">
            Печатает...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-ai">
        <div className="flex items-center gap-1.5 h-5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
