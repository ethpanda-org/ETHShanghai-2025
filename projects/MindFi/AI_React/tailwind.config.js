export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    safelist: [
        {
            pattern: /text-(1|2|3|4|5|6)xl/,
        },
    ],
    theme: {
        extend: {
            screens: {
                'xs': '480px', // 自定义小屏幕断点
                '3xl': '1920px', // 自定义超大屏断点
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
                'share-tech': ['Share Tech Mono', 'monospace'],
                'montserrat': ['Montserrat', 'sans-serif'],
                'Roboto': ['Roboto', 'sans-serif'],
            },
            colors: {
                // 自定义颜色
                accent: {
                    DEFAULT: '#2481cc',
                    hover: '#1a8ad5',
                    dark: '#1c93e3',
                },
                'custom-black': 'rgba(10, 10, 10, 0.70)',
                'text-secondary': '#7d7f81',
                'box-bg-blured-light': 'rgba(255, 255, 255, 0.84)',
                'box-bg-blured-dark': 'rgba(34, 34, 34, 0.84)',
                'tme-logo-color-light': '#363b40',
                'tme-logo-color-dark': '#fff',
                'accent-link-light': '#2481cc',
                'accent-link-dark': '#3ca1eb',
            },
            backgroundImage: theme => ({
                'background-pattern': "url('@/assets/image/background.svg')",
                'gradient-custom': 'linear-gradient(120deg, #4f0088 0%, #000000 100%)',
            }),
            keyframes: {
                'bg-motion': {
                    '20%': {transform: 'translateX(0px)'},
                    '25%': {transform: 'translateX(-10px)'},
                    '35%': {transform: 'translateX(10px)'},
                    '40%': {transform: 'translateX(0px)'},
                },
                rotate: {
                    '0%': {transform: 'rotate(0deg)'},
                    '100%': {transform: 'rotate(360deg)'},
                },
                path: {
                    "0%, 34%, 71%, 100%": {
                        transform: 'scale(1)'
                    },
                    '17%': {
                        transform: 'scale(1.2)'
                    },
                    '49%': {
                        transform: 'scale(1.2)'
                    },
                    '83%': {
                        transform: 'scale(1)'
                    },
                },
                radar81: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
            },
            animation: {
                'bg-motion': 'bg-motion 10s linear infinite',
                "rotate": 'rotate 10s linear infinite',
                "path": "path 1.5s linear 0.5s infinite",
                radar: 'radar81 2s linear infinite',
            }
            ,
        },
    },
    plugins: [],
}