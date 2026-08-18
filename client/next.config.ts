import type {NextConfig} from 'next';

// When building the static export for the Go binary, write to a separate
// .next-export directory so it never clobbers the running `next dev` .next
// folder (which otherwise causes "Cannot find module './XXXX.js'" errors).
const isExportBuild = process.env.NEXT_BUILD_EXPORT === '1';

const nextConfig: NextConfig = {
  output: 'export',
  distDir: isExportBuild ? '.next-export' : '.next',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
