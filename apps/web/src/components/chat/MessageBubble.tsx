'use client'

import React from 'react'

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

/** Render inline markdown: **bold**, *italic*, `code` */
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Match **bold**, *italic*, `code` — in that order to avoid conflicts
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-white/10 text-[13px] font-mono">
          {match[4]}
        </code>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl
          ${isUser
            ? 'chat-bubble-user rounded-br-md'
            : 'chat-bubble-ai rounded-bl-md'
          }
        `}
      >
        <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
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
