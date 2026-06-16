import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PHASE 1 (demo): serve the static prototype embedded in public/demo at the
  // site root. These redirects are temporary and will be removed in Phase 2
  // once real Next.js routes replace the prototype.
  async redirects() {
    return [
      { source: "/", destination: "/demo/index.html", permanent: false },
      { source: "/app", destination: "/demo/app.html", permanent: false },
    ];
  },
};

export default nextConfig;
