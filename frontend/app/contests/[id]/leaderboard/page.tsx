import LeaderboardClient from './LeaderboardClient'

export function generateStaticParams() {
  return [{ id: 'demo' }]
}

export default function Page() {
  return <LeaderboardClient />
}
