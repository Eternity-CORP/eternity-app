'use client'

interface TypingIndicatorProps {
  streamingContent?: string
}

export default function TypingIndicator({ streamingContent }: TypingIndicatorProps) {
  if (streamingContent) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-ai">
          <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
            {streamingContent}
          </p>
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
