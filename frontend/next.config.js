/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://32.192.188.66:5000/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig

