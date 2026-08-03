import ProfileClient from './ProfileClient'

export function generateStaticParams() {
  return [{ username: 'demo' }]
}

export default function Page() {
  return <ProfileClient />
}
