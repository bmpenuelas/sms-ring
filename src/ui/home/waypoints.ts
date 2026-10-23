// Measures the stops a travelling message visits, so a design can animate it
// between real element positions on any screen size or language. Elements
// marked `data-stop="0..n"` (optionally `data-anchor="l|r|t|b|c"` combos)
// become CSS variables --x0/--y0, --x1/--y1… relative to the host element,
// ready to use inside @keyframes.
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, type Ref } from 'vue'

export function useWaypoints(host: Ref<HTMLElement | undefined>) {
  const vars = reactive<Record<string, string>>({})
  /** The same stops as numbers, in order, e.g. to draw the path between them. */
  const points = ref<{ x: number; y: number }[]>([])
  let observer: ResizeObserver | undefined

  function measure() {
    const el = host.value
    if (!el) return
    const box = el.getBoundingClientRect()
    const found: { i: number; x: number; y: number }[] = []
    el.querySelectorAll<HTMLElement>('[data-stop]').forEach((node) => {
      const r = node.getBoundingClientRect()
      const anchor = node.dataset.anchor ?? 'c'
      let x = r.left + r.width / 2
      let y = r.top + r.height / 2
      if (anchor.includes('l')) x = r.left
      if (anchor.includes('r')) x = r.right
      if (anchor.includes('t')) y = r.top
      if (anchor.includes('b')) y = r.bottom
      vars[`--x${node.dataset.stop}`] = `${Math.round(x - box.left)}px`
      vars[`--y${node.dataset.stop}`] = `${Math.round(y - box.top)}px`
      found.push({ i: Number(node.dataset.stop), x: Math.round(x - box.left), y: Math.round(y - box.top) })
    })
    points.value = found.sort((a, b) => a.i - b.i).map(({ x, y }) => ({ x, y }))
  }

  onMounted(async () => {
    await nextTick()
    measure()
    observer = new ResizeObserver(measure)
    if (host.value) {
      observer.observe(host.value)
      host.value.querySelectorAll('[data-stop]').forEach((n) => observer!.observe(n))
    }
    void document.fonts?.ready.then(measure)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { vars, points, measure }
}
