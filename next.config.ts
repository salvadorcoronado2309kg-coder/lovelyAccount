import type { NextConfig } from 'next';

// En GitHub Pages la web vive en /lovelyAccount; en local no hay prefijo.
const enPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: enPages ? '/lovelyAccount' : '',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
