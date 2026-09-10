export type AgentAction = 'REMIND' | 'COUNSEL' | 'LOCK_SOCIAL' | 'ALLOW' | 'BLOCK_QUIET_HOURS'

export type FocusPolicy = {
  quietHoursStart: number
  quietHoursEnd: number
  excessiveInterruptions: number
  lockMinutes: number
  approvedStudyTools: string[]
  socialTargets: string[]
  emergencyUnlocksPerDay: number
}

export type AgentEvent = {
  type: 'social_attempt' | 'counseling_completed' | 'unlock_requested' | 'feedback'
  timestamp: string
  target?: string
  acknowledged?: boolean
  helpful?: boolean
  note?: string
}

export type AgentDecision = {
  action: AgentAction
  reason: string
  counseling?: string
  confidence: number
  reversible: boolean
}

export type LearningTask = {
  id: string
  title: string
  subject: string
  minutes: number
  status: 'next' | 'done'
}

export const defaultPolicy: FocusPolicy = {
  quietHoursStart: 23,
  quietHoursEnd: 5,
  excessiveInterruptions: 3,
  lockMinutes: 180,
  approvedStudyTools: ['study tools', 'notes', 'calculator'],
  socialTargets: ['social media', 'short-form video', 'configured social app'],
  emergencyUnlocksPerDay: 2,
}

export function isQuietHours(hour: number, policy = defaultPolicy): boolean {
  return policy.quietHoursStart > policy.quietHoursEnd
    ? hour >= policy.quietHoursStart || hour < policy.quietHoursEnd
    : hour >= policy.quietHoursStart && hour < policy.quietHoursEnd
}

export function decideInterruption(
  events: AgentEvent[],
  policy = defaultPolicy,
  now = new Date(),
): AgentDecision {
  const currentHour = now.getHours()
  if (isQuietHours(currentHour, policy)) {
    return {
      action: 'BLOCK_QUIET_HOURS',
      reason: 'Social media is blocked during the approved 11 PM to 5 AM quiet window.',
      confidence: 1,
      reversible: false,
    }
  }

  const interruptions = events.filter((event) => event.type === 'social_attempt').length
  const counselingAcknowledged = events.some(
    (event) => event.type === 'counseling_completed' && event.acknowledged,
  )

  if (interruptions >= policy.excessiveInterruptions && !counselingAcknowledged) {
    return {
      action: 'COUNSEL',
      reason: `${interruptions} social-media attempts were detected during this focus session.`,
      counseling: 'Pause for two minutes, name the next small study step, then choose whether to resume or take a break.',
      confidence: 0.92,
      reversible: true,
    }
  }

  if (interruptions >= policy.excessiveInterruptions && counselingAcknowledged) {
    return {
      action: 'LOCK_SOCIAL',
      reason: 'Social-media use continued after counseling, so the approved three-hour lock is active.',
      confidence: 1,
      reversible: true,
    }
  }

  return {
    action: 'REMIND',
    reason: 'One social-media interruption was recorded. A short reminder is appropriate.',
    confidence: 0.88,
    reversible: true,
  }
}

export function adaptCounseling(helpful: boolean, previousConfidence: number): number {
  return Math.max(0.4, Math.min(0.98, previousConfidence + (helpful ? 0.03 : -0.08)))
}

export function createLearningTasks(subject: string, profile: string): LearningTask[] {
  return [
    { id: `${subject}:concept`, title: `Review one ${subject} concept`, subject, minutes: 25, status: 'next' },
    { id: `${subject}:practice`, title: `Complete three ${subject} practice questions`, subject, minutes: 20, status: 'next' },
    { id: `${subject}:recall`, title: `Write a five-minute ${subject} recall summary`, subject, minutes: profile === 'Researcher' ? 10 : 5, status: 'next' },
  ]
}
