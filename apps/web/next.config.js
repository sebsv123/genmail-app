/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ["@genmail/db", "@genmail/shared", "@genmail/queue"],
}

module.exports = nextConfig
