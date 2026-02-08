'use client'

import { renderMarkdown } from '@/lib/markdown'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: { name: string }[]
}

interface MessageBubbleProps {
  message: ChatMessage
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] min-w-0 px-4 py-3 rounded-2xl overflow-hidden
          ${isUser
            ? 'chat-bubble-user rounded-br-md'
            : 'chat-bubble-ai rounded-bl-md'
          }
        `}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
          {renderMarkdown(message.content)}
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.toolCalls.map((tool, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#3388FF]/15 text-[#3388FF] border border-[#3388FF]/20"
              >
                {tool.name}
              </span>
            ))}
          </div>
        )}

        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-white/30 text-right' : 'text-white/25'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}
