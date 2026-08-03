import SubmissionClient from './SubmissionClient'

export function generateStaticParams() {
  return [{ id: 'demo' }]
}

export default function Page() {
  return <SubmissionClient />
}
