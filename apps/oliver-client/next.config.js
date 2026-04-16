/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: "standalone",
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '*.atl-paas.net',
            },
            {
                protocol: 'https',
                hostname: 'avatars.linear.app',
            },
            {
                protocol: 'https',
                hostname: 'trello-avatars.s3.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: 'secure.gravatar.com',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://oliver-server-qw6b.vercel.app/api/:path*',
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'self' https://*.atlassian.net https://*.atlassian.com https://*.jira.com https://trello.com;",
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'ALLOW-FROM https://*.atlassian.net', // Fallback, though CSP takes precedence
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
