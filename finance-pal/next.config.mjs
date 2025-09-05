/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/finance-pal',
  assetPrefix: '/finance-pal',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
