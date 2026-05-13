export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong'

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export const statusColor = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived:  'bg-amber-100 text-amber-700',
  waiting:   'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100 text-amber-700',
  ended:     'bg-gray-100 text-gray-500',
}

export const OPTION_COLORS = [
  { bg: 'bg-red-500',    hover: 'hover:bg-red-600',    light: 'bg-red-50 border-red-200',    text: 'text-red-700',    icon: '▲' },
  { bg: 'bg-blue-500',   hover: 'hover:bg-blue-600',   light: 'bg-blue-50 border-blue-200',  text: 'text-blue-700',   icon: '◆' },
  { bg: 'bg-amber-500',  hover: 'hover:bg-amber-600',  light: 'bg-amber-50 border-amber-200',text: 'text-amber-700',  icon: '●' },
  { bg: 'bg-green-500',  hover: 'hover:bg-green-600',  light: 'bg-green-50 border-green-200',text: 'text-green-700',  icon: '■' },
]

export const MEDAL = ['🥇', '🥈', '🥉']
