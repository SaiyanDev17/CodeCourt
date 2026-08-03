import ProblemClient from './ProblemClient'

export function generateStaticParams() {
  return [
    { slug: 'two-sum' },
    { slug: 'demo' }
  ]
}

export default function Page() {
  return <ProblemClient />
}
