/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_VIDEO_BASE_URL: process.env.NEXT_PUBLIC_VIDEO_BASE_URL || 'https://your-bucket.s3.amazonaws.com',
  },
};

module.exports = nextConfig;
