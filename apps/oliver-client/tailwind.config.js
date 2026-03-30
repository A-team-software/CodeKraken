/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out',
                'slide-in-bottom': 'slideInBottom 0.6s ease-out',
                'slide-in-left': 'slideInLeft 0.6s ease-out',
                'slide-in-right': 'slideInRight 0.6s ease-out',
                'float': 'float 3s ease-in-out infinite',
                'glow': 'glow 3s ease-in-out infinite',
                'gradient': 'gradient 6s ease infinite',
                'headline-rotate': 'headlineRotate 12s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInBottom: {
                    '0%': { transform: 'translateY(2rem)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-2rem)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(2rem)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                glow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
                },
                gradient: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                headlineRotate: {
                    '0%, 5%': { opacity: '1', transform: 'translateY(0)' },
                    '30%, 35%': { opacity: '0', transform: 'translateY(10px)' },
                    '35%, 65%': { opacity: '0', transform: 'translateY(10px)' },
                    '65%, 70%': { opacity: '0', transform: 'translateY(10px)' },
                    '70%, 95%': { opacity: '1', transform: 'translateY(0)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    darkMode: "class",
    plugins: [],
}

