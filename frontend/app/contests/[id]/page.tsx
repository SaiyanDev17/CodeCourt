import ContestClient from './ContestClient'

export function generateStaticParams() {
  return [{ id: 'demo' }]
}

export default function Page() {
  return <ContestClient />
}
