export type Phase = 'working' | 'due' | 'break' | 'ready' | 'paused'
export type LivePhase = Exclude<Phase, 'paused'>
export interface WaterEntry {
  id: string
  timestamp: number
  amountMl: number
}
export interface Segment {
  start: number
  end: number
}
export interface WorkSession {
  id: string
  startedAt: number
  endedAt: number | null
  segments: Segment[]
}
export interface BreakRecord {
  id: string
  timestamp: number
  durationMs: number
  status: 'completed' | 'skipped' | 'interrupted'
}
export interface Settings {
  dailyWaterGoalMl: number
  workIntervalMinutes: number
  breakDurationMinutes: number
  notificationsEnabled: boolean
}
export interface ActiveSession {
  sessionId: string
  phase: Phase
  resumePhase: LivePhase | null
  deadline: number | null
  remainingMs: number
  plannedBreakMs: number
  workStartedAt: number | null
  checkpoint: number
  dueEventId: string | null
}
export interface Task {
  id: string
  title: string
  createdAt: number
  completedAt: number | null
  reminderAt: number | null
  reminderStatus: 'scheduled' | 'due' | 'dismissed' | null
  notificationSent: boolean
}
export interface AppData {
  schemaVersion: 2
  revision: number
  tasks: Task[]
  water: WaterEntry[]
  sessions: WorkSession[]
  breaks: BreakRecord[]
  settings: Settings
  active: ActiveSession | null
  notifiedEvents: string[]
}
