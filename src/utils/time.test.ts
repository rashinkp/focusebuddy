import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('local timezone boundaries', () => {
  it.each([
    { month: 2, day: 8, hours: 23 },
    { month: 10, day: 1, hours: 25 },
  ])(
    'uses a $hours-hour calendar day at DST transition',
    ({ month, day, hours }) => {
      const module = resolve('src/utils/time.ts')
      const result = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import {dayBounds} from ${JSON.stringify(module)}; const [a,b]=dayBounds(new Date(2026,${month},${day},12).getTime()); console.log((b-a)/3600000)`,
        ],
        { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' },
      )
      expect(Number(result.trim())).toBe(hours)
    },
  )
  it('regroups timestamps when the timezone changes', () => {
    const module = resolve('src/utils/time.ts')
    const code = `import {dayKey} from ${JSON.stringify(module)}; console.log(dayKey(Date.parse('2026-10-28T01:00:00Z')))`
    const utc = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', code],
      { env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8' },
    ).trim()
    const pacific = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', code],
      { env: { ...process.env, TZ: 'America/Los_Angeles' }, encoding: 'utf8' },
    ).trim()
    expect(utc).toBe('2026-10-28')
    expect(pacific).toBe('2026-10-27')
  })
})
