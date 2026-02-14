/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
