/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output = tiny Docker image (see ../Dockerfile.frontend / docker-compose.yml).
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
