export type PulseEffect = {
    domain: string
    effectType: 'create' | 'update' | 'delete' | 'derive'
    targetRef?: string
    payload: Record<string, unknown>
    confidence: number
    source: 'daily_run' | 'voice' | 'manual' | 'recovery'
}
