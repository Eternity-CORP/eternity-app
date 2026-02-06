'use client'

interface HistoryTransaction {
  hash: string
  from: string
  to: string
  amount: string
  token: string
  direction: 'sent' | 'received'
  date: string
}

interface HistoryCardProps {
  transactions: HistoryTransaction[]
  userAddress: string
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </svg>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function HistoryCard({ transactions, userAddress }: HistoryCardProps) {
  const visible = transactions.slice(0, 5)

  return (
    <div className="flex justify-start">
      <div className="glass-card rounded-2xl p-4 max-w-[360px] w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">History</span>
          {transactions.length > 0 && (
            <span className="text-[10px] text-white/30 ml-auto">{transactions.length} txn{transactions.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Transaction list */}
        {visible.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-white/30">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {visible.map((tx) => {
              const isSent = tx.direction === 'sent'
              const counterparty = isSent ? tx.to : tx.from

              return (
                <div
                  key={tx.hash}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/3 transition-colors"
                >
                  {/* Direction icon */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSent ? 'bg-white/5 text-white/50' : 'bg-[#22C55E]/10 text-[#22C55E]'
                  }`}>
                    {isSent ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate">
                      {isSent ? 'To ' : 'From '}
                      <span className="font-mono text-white/50">{truncateAddress(counterparty)}</span>
                    </p>
                    <p className="text-[10px] text-white/30">{formatDate(tx.date)}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-mono font-medium ${isSent ? 'text-white/60' : 'text-[#22C55E]'}`}>
                      {isSent ? '-' : '+'}{tx.amount} {tx.token}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
