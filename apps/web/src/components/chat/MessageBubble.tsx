'use client'

import type { ChatMessage } from '@e-y/shared'
import { renderMarkdown } from '@/lib/markdown'

interface MessageBubbleProps {
  message: ChatMessage
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function stripToolXml(text: string): string {
  return text
    .replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/g, '')
    .replace(/<[^>]*>[\s\S]*?<\/antml:[^>]*>/g, '')
    .trim()
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const cleanContent = isUser ? message.content : stripToolXml(message.content)

  if (!cleanContent) return null

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
        <div className="text-sm text-[var(--foreground)]/90 leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
          {renderMarkdown(cleanContent)}
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

        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-[var(--foreground)]/30 text-right' : 'text-[var(--foreground)]/25'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  )
}
