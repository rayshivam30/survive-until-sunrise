/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production deployment
  output: 'standalone',
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['howler'],
  },
  
  // Configure headers for better security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=*, camera=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Optimize images and assets
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
  
  // Optimize for hackathon demo
  env: {
    DEMO_MODE: 'true',
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
