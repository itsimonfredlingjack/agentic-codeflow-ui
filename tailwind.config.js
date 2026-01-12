/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                sapphire: 'hsl(210, 100%, 50%)',
                emerald: 'hsl(150, 100%, 40%)',
                amber: 'hsl(35, 100%, 50%)',
                amethyst: 'hsl(270, 90%, 60%)',
            },
            transitionDuration: {
                'fast': '150ms',
                'normal': '200ms',
                'slow': '300ms',
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
        },
    },
    plugins: [],
};
