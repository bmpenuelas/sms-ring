type AutomationRun = { at: number; verdict: string }

/** Keep the newest observed run; a missing native result cannot undo setup. */
export function latestAutomationRun(...runs: unknown[]): AutomationRun | undefined {
  let latest: AutomationRun | undefined
  for (const run of runs) {
    if (!run || typeof run !== 'object' || !('at' in run) || !('verdict' in run)) continue
    if (typeof run.at !== 'number' || !Number.isFinite(run.at) || run.at <= 0 || typeof run.verdict !== 'string') continue
    if (!latest || run.at > latest.at) latest = { at: run.at, verdict: run.verdict }
  }
  return latest
}
