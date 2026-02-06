'use client'

interface SuggestionChipsProps {
  onSelect: (text: string) => void
  hasMessages: boolean
}

const NEW_USER_CHIPS = [
  'Что ты умеешь?',
  'Покажи баланс',
  'Как отправить крипто?',
]

const RETURNING_USER_CHIPS = [
  'Баланс',
  'Отправить',
  'BLIK',
  'История',
]

export default function SuggestionChips({ onSelect, hasMessages }: SuggestionChipsProps) {
  const chips = hasMessages ? RETURNING_USER_CHIPS : NEW_USER_CHIPS

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="suggestion-chip rounded-xl px-4 py-2 text-xs font-medium text-white/60 hover:text-white cursor-pointer"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
