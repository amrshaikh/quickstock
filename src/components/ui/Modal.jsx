import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-primary-100)]">
          <h2 className="text-xl font-semibold text-[var(--color-primary-900)]">{title}</h2>
          <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-primary-50)] rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-primary-100)] rounded-xl shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[var(--color-primary-100)]">
          <h3 className="text-lg font-semibold text-[var(--color-primary-900)]">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
