/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "16mb" }, // يتوافق مع حد رفع الملفات 15MB
  },
  // تعطيل x-powered-by header للأمان
  poweredByHeader: false,
};

module.exports = nextConfig;
