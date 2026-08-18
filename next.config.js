/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is required for the Dockerfile (see Dockerfile comment)
  // and is harmless under the Netlify Next.js plugin.
  output: "standalone",
};

module.exports = nextConfig;
