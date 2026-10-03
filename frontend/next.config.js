/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Needed for react-plotly.js dynamic import
  },
};

module.exports = nextConfig;
