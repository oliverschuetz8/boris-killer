import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'stnaejqqzfvqgcfgwlpl.supabase.co',
      },
    ],
  },
}

export default nextConfig
