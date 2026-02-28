'use client'

interface SuggestionChipsProps {
  onSelect: (text: string) => void
  hasMessages: boolean
  centered?: boolean
}

const NEW_USER_CHIPS = ['What can you do?', 'Show balance', 'How to send crypto?']

const RETURNING_USER_CHIPS = ['Balance', 'Send', 'BLIK', 'History']

export default function SuggestionChips({ onSelect, hasMessages, centered }: SuggestionChipsProps) {
  const chips = hasMessages ? RETURNING_USER_CHIPS : NEW_USER_CHIPS

  return (
    <div className={`flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="suggestion-chip rounded-xl px-4 py-2 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
