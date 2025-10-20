/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#ff007a",
        surface: "#1c1f2b",
        surfaceMuted: "#151822",
        surfaceHighlight: "#2b2f3a"
      },
      backgroundImage: {
        "uniswap-glow":
          "radial-gradient(circle at 20% 20%, rgba(255,0,122,0.35), transparent 55%), radial-gradient(circle at 80% 10%, rgba(64, 87, 255, 0.4), transparent 50%), radial-gradient(circle at 50% 80%, rgba(255, 204, 0, 0.25), transparent 50%)"
      },
      boxShadow: {
        focus: "0 0 0 1px rgba(255, 0, 122, 0.4), 0 0 0 4px rgba(255, 0, 122, 0.15)"
      }
    }
  },
  plugins: []
};
