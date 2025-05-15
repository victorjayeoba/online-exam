/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable SWC by enabling Babel
  compiler: {
    // Enables the compiled-swc option for next/jest
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig
