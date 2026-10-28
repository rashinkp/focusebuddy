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
export interface AppData {
  schemaVersion: 1
  revision: number
  water: WaterEntry[]
  sessions: WorkSession[]
  breaks: BreakRecord[]
  settings: Settings
  active: ActiveSession | null
  notifiedEvents: string[]
}
