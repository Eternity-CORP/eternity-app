'use client'

import { renderMarkdown } from '@/lib/markdown'

interface TypingIndicatorProps {
  streamingContent?: string
}

export default function TypingIndicator({ streamingContent }: TypingIndicatorProps) {
  if (streamingContent) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-ai">
          <div className="text-sm text-[var(--foreground)]/90 leading-relaxed whitespace-pre-wrap">
            {renderMarkdown(streamingContent)}
          </div>
          <p className="text-[10px] mt-1.5 text-[#3388FF]/60">
            AI is responding...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-ai">
        <div className="flex items-center gap-1.5 h-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-subtle)] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-subtle)] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-subtle)] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
