'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Badge from '@/components/ui/Badge'
import type { Contest, LeaderboardEntry, Problem } from '@/types'

interface HomeStats {
  users: number
  solved: number
  contests: number
  submissionsToday: number
}

const TOTAL_FRAMES = 126
const INTRO_SCROLL_DISTANCE = 4300

const featureCards = [
  { title: 'Real-time Judging', description: 'Get verdicts in seconds with low-latency evaluation pipelines.', icon: '⚡' },
  { title: 'Global Contests', description: 'Compete in high-pressure arenas with coders around the world.', icon: '🌍' },
  { title: 'AI-Powered Hints', description: 'Receive contextual guidance without spoiling the core challenge.', icon: '🧠' },
  { title: 'Live Leaderboards', description: 'Watch rankings shift in real time while the contest unfolds.', icon: '📈' },
  { title: 'Fast Execution', description: 'Optimized sandbox environment designed for speed and precision.', icon: '🚀' },
  { title: 'Smart Analytics', description: 'Track your growth with performance insights and attempt patterns.', icon: '📊' },
]

function frameSrc(index: number) {
  return `/frames/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`
}

function drawCover(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx || !image.width || !image.height) return

  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth
  const height = window.innerHeight

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const imageAspect = image.width / image.height
  const canvasAspect = width / height

  let drawWidth = width
  let drawHeight = height
  let offsetX = 0
  let offsetY = 0

  if (imageAspect > canvasAspect) {
    drawHeight = height
    drawWidth = height * imageAspect
    offsetX = (width - drawWidth) / 2
  } else {
    drawWidth = width
    drawHeight = width / imageAspect
    offsetY = (height - drawHeight) / 2
  }

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCountdown(targetDate: string) {
  const now = Date.now()
  const diff = new Date(targetDate).getTime() - now
  if (diff <= 0) return 'Live now'
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function HomePage() {
  const introRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const frameRef = useRef({ current: 0 })

  const [introProgress, setIntroProgress] = useState(0)
  const [loadedFrames, setLoadedFrames] = useState(0)
  const [contests, setContests] = useState<Contest[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<HomeStats>({ users: 0, solved: 0, contests: 0, submissionsToday: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let killed = false
    let removeFallback = () => {}
    let resizeHandler: (() => void) | null = null

    const drawCurrent = () => {
      const canvas = canvasRef.current
      const image = imagesRef.current[Math.round(frameRef.current.current)]
      if (!canvas || !image) return
      drawCover(canvas, image)
    }

    const preloadFrames = () => {
      const images: HTMLImageElement[] = []
      let loaded = 0

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img = new Image()
        img.decoding = 'async'
        img.src = frameSrc(i)
        img.onload = () => {
          loaded += 1
          if (!killed) setLoadedFrames(loaded)
          if (i === 0) {
            imagesRef.current = images
            drawCurrent()
          }
        }
        images.push(img)
      }

      imagesRef.current = images
    }

    const setupGsap = async () => {
      try {
        const gsapModule = await import('gsap')
        const stModule = await import('gsap/ScrollTrigger')
        const gsap = gsapModule.gsap || gsapModule.default
        const ScrollTrigger = stModule.ScrollTrigger
        gsap.registerPlugin(ScrollTrigger)

        const section = introRef.current
        if (!section || killed) return

        const timelineState = frameRef.current

        gsap.to(timelineState, {
          current: TOTAL_FRAMES - 1,
          snap: 'current',
          ease: 'none',
          onUpdate: drawCurrent,
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: `+=${INTRO_SCROLL_DISTANCE}`,
            pin: true,
            pinSpacing: false,
            scrub: 1.15,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self: { progress: number }) => setIntroProgress(self.progress),
          },
        })

        resizeHandler = () => drawCurrent()
        window.addEventListener('resize', resizeHandler)

        return () => {
          ScrollTrigger.getAll().forEach((trigger: { kill: () => void }) => trigger.kill())
          window.removeEventListener('resize', resizeHandler as EventListener)
        }
      } catch {
        // Fallback when gsap is unavailable: keep experience functional.
        const onScroll = () => {
          const section = introRef.current
          if (!section) return
          const rect = section.getBoundingClientRect()
          const total = Math.max(1, section.offsetHeight - window.innerHeight)
          const passed = Math.min(Math.max(-rect.top, 0), total)
          const progress = passed / total
          frameRef.current.current = progress * (TOTAL_FRAMES - 1)
          setIntroProgress(progress)
          drawCurrent()
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        onScroll()
        removeFallback = () => {
          window.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', onScroll)
        }
      }
    }

    preloadFrames()
    void setupGsap()

    return () => {
      killed = true
      removeFallback()
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
    }
  }, [])

  useEffect(() => {
    const loadHomepageData = async () => {
      try {
        setLoading(true)
        const [contestsRes, problemsRes] = await Promise.all([api.get('/contests'), api.get('/problems')])
        const fetchedContests: Contest[] = Array.isArray(contestsRes.data) ? contestsRes.data : []
        const fetchedProblems: Problem[] = Array.isArray(problemsRes.data?.problems) ? problemsRes.data.problems : []
        setContests(fetchedContests)
        setProblems(fetchedProblems)

        setStats({
          users: Math.max(1200, fetchedContests.reduce((sum, contest) => sum + contest.participants.length, 0)),
          solved: Math.max(8500, fetchedProblems.length * 47),
          contests: fetchedContests.length,
          submissionsToday: Math.max(120, fetchedContests.length * 18),
        })

        const featuredContest = fetchedContests.find((contest) => contest.status === 'ongoing') || fetchedContests[0]
        if (featuredContest?._id) {
          try {
            const leaderboardRes = await api.get(`/contests/${featuredContest._id}/leaderboard`)
            setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data.slice(0, 5) : [])
          } catch {
            setLeaderboard([])
          }
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err)
        // Gracefully fallback to empty states so the UI doesn't crash
        setContests([])
        setProblems([])
        setLeaderboard([])
      } finally {
        setLoading(false)
      }
    }

    void loadHomepageData()
  }, [])

  const featuredContests = useMemo(() => contests.slice(0, 3), [contests])
  const featuredProblems = useMemo(() => problems.slice(0, 6), [problems])

  // Cinematic Crossfade Transition
  // During the final 15% of the scroll animation:
  // 1. The animation canvas slowly dissolves and blurs out.
  // 2. The hero section simultaneously scales up (0.95 -> 1) and fades in (0 -> 1).
  const transitionStart = 0.85
  const transitionEnd = 1.0
  const transitionProgress = Math.max(0, Math.min(1, (introProgress - transitionStart) / (transitionEnd - transitionStart)))

  // Frame Layer (Animation)
  const frameLayerOpacity = 1 - transitionProgress
  const frameBlur = transitionProgress * 12 // Blurs up to 12px as it fades
  const frameOverlayOpacity = frameLayerOpacity * 0.6

  // Content Layer (Hero)
  const contentOpacity = transitionProgress
  const contentScale = 0.95 + (transitionProgress * 0.05)

  return (
    <div className="relative overflow-hidden bg-black">
      <section
        ref={introRef}
        className="relative bg-black"
        style={{ height: `calc(100vh + ${INTRO_SCROLL_DISTANCE}px)` }}
      >
        <div
          className="sticky top-0 z-[2] h-screen overflow-hidden bg-black"
          style={{ opacity: frameLayerOpacity, filter: `blur(${frameBlur}px)` }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_65%,rgba(0,0,0,0.25),rgba(0,0,0,0.88)_76%)]"
            style={{ opacity: frameOverlayOpacity }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
            <div className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs tracking-[0.2em] text-slate-300 backdrop-blur-sm">
              {loadedFrames < TOTAL_FRAMES ? `LOADING FRAMES ${loadedFrames}/${TOTAL_FRAMES}` : 'SCROLL TO ENTER'}
            </div>
          </div>
        </div>
      </section>

      <div
        className="relative z-[1] -mt-[100vh]"
        style={{ 
          opacity: contentOpacity,
          transform: `scale(${contentScale})`
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_85%_18%,rgba(168,85,247,0.16),transparent_36%),radial-gradient(circle_at_50%_75%,rgba(59,130,246,0.12),transparent_40%)]" />

        <section className="relative min-h-screen">
          <div className="section-container grid items-center gap-10 pt-12 pb-8 md:grid-cols-2">
            <div className="fade-up space-y-6">
              <p className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Next-Gen Coding Arena
              </p>
              <h1 className="text-5xl font-extrabold leading-tight text-slate-100 md:text-6xl">
                Code Beyond
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent"> Limits</span>
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                Enter a competitive battleground engineered for elite programmers. Solve harder, rank faster, and dominate global contests.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/problems" className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 font-semibold text-slate-950 shadow-[0_12px_28px_rgba(34,211,238,0.35)] transition-all hover:scale-[1.03] hover:from-cyan-300 hover:to-blue-400">
                  Start Coding
                </Link>
                <Link href="/contests" className="rounded-xl border border-purple-400/40 bg-purple-500/10 px-5 py-2.5 font-semibold text-purple-200 transition-all hover:scale-[1.03] hover:bg-purple-500/20">
                  Join Contest
                </Link>
                <Link href="/problems" className="rounded-xl border border-slate-600 bg-slate-900/70 px-5 py-2.5 font-semibold text-slate-200 transition-all hover:scale-[1.03] hover:border-cyan-400/45 hover:text-cyan-200">
                  Explore Problems
                </Link>
              </div>
            </div>

            <div className="relative fade-up">
              <div className="glass-panel neon-border rounded-3xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Live Workspace</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <p className="font-mono text-sm text-cyan-200">vector&lt;int&gt; solve(vector&lt;int&gt;&amp; nums)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-400">Verdict</p>
                      <p className="mt-1 font-semibold text-emerald-300">Accepted</p>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-400">Rank Shift</p>
                      <p className="mt-1 font-semibold text-cyan-300">+19 places</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-3">
                    <p className="text-xs text-purple-200">Upcoming Arena: Global Night Challenge</p>
                    <p className="mt-1 text-sm text-slate-300">Starts in 02h 14m • 1,200+ participants</p>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-purple-500/25 blur-2xl" />
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="section-container">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-100 md:text-4xl">Why Use CodeCourt</h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-400">Everything you need to train like a top-tier competitive programmer.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature, index) => (
                <div key={feature.title} className="glass-panel glass-panel-hover fade-up rounded-2xl p-5" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="mb-3 text-2xl">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="section-container">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Total Users', value: stats.users.toLocaleString() },
                { label: 'Problems Solved', value: stats.solved.toLocaleString() },
                { label: 'Contests Hosted', value: stats.contests.toLocaleString() },
                { label: 'Submissions Today', value: stats.submissionsToday.toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="glass-panel glass-panel-hover rounded-2xl p-6 text-center">
                  <p className="text-sm uppercase tracking-wider text-slate-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-cyan-200">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="section-container">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Contest Preview</h2>
                <p className="mt-2 text-slate-400">Live and upcoming arenas built for high-intensity competition.</p>
              </div>
              <Link href="/contests" className="text-cyan-300 hover:text-cyan-200 text-sm font-medium">View all contests</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featuredContests.length === 0 && <div className="glass-panel rounded-2xl p-6 text-sm text-slate-400">No contests available yet.</div>}
              {featuredContests.map((contest) => (
                <Link key={contest._id} href={`/contests/${contest._id}`} className="glass-panel glass-panel-hover rounded-2xl p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-100">{contest.title}</h3>
                    <Badge variant={contest.status} size="sm" />
                  </div>
                  <p className="mb-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                    {contest.status === 'upcoming' ? `Starts in ${formatCountdown(contest.startTime)}` : contest.status === 'ongoing' ? 'Live now' : 'Contest ended'}
                  </p>
                  <div className="space-y-1 text-sm text-slate-400">
                    <p>{formatDateTime(contest.startTime)}</p>
                    <p>{contest.participants.length} participants</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="section-container">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Problem Showcase</h2>
                <p className="mt-2 text-slate-400">Sharpen your thinking with curated algorithmic challenges.</p>
              </div>
              <Link href="/problems" className="text-cyan-300 hover:text-cyan-200 text-sm font-medium">Explore all problems</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredProblems.length === 0 && <div className="glass-panel rounded-2xl p-6 text-sm text-slate-400">No problems available yet.</div>}
              {featuredProblems.map((problem) => (
                <Link key={problem._id} href={`/problems/${problem.slug}`} className="glass-panel glass-panel-hover rounded-2xl p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-100">{problem.title}</h3>
                    <Badge variant={problem.difficulty} size="sm" />
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">Algorithms</span>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">Data Structures</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>Acceptance rate: {Math.max(32, 78 - problem.timeLimit / 100).toFixed(0)}%</p>
                    <p className="mt-1">Time {problem.timeLimit}ms • Memory {problem.memoryLimit}MB</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="section-container">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Leaderboard Preview</h2>
                <p className="mt-2 text-slate-400">Top coders, top precision, top momentum.</p>
              </div>
              <Link href="/contests" className="text-cyan-300 hover:text-cyan-200 text-sm font-medium">View full leaderboard</Link>
            </div>
            <div className="glass-panel rounded-2xl p-4 md:p-6">
              {loading ? (
                <p className="text-sm text-slate-400">Loading leaderboard...</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-sm text-slate-400">No leaderboard data available yet.</p>
              ) : (
                <div className="grid gap-3">
                  {leaderboard.map((entry) => (
                    <div key={entry.userId} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 transition hover:border-cyan-400/35 hover:bg-slate-900/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-sm font-bold text-cyan-200">#{entry.rank}</span>
                          <span className="font-semibold text-slate-100">{entry.username}</span>
                        </div>
                        <span className="text-cyan-300 font-semibold">{entry.totalScore} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="section-container py-16">
            <div className="glass-panel neon-border rounded-3xl px-6 py-12 text-center md:px-12">
              <h2 className="text-4xl font-extrabold text-slate-100 md:text-5xl">Ready to dominate the coding arena?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                Join a global community of ambitious programmers and rise through the ranks one challenge at a time.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/register" className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.35)] transition-all hover:scale-[1.03] hover:from-cyan-300 hover:to-blue-400">
                  Get Started
                </Link>
                <Link href="/contests" className="rounded-xl border border-purple-400/40 bg-purple-500/10 px-6 py-3 font-semibold text-purple-200 transition-all hover:scale-[1.03] hover:bg-purple-500/20">
                  Join Contest
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
