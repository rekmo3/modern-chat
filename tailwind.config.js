/** @type {import('tailwindcss').Config} */
module.exports = {
  // Шляхи до всіх директорій з компонентами та екранами
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#7C5CFC", // М'який фіолетовий акцент
        primaryDark: "#6544E8",
        secondary: "#FFFFFF", // Картки, бульбашки співрозмовника, поля вводу
        surface: "#F6F3FF", // Світлий лавандовий фон
        surfaceLight: "#E4DEF7", // Межі та розділювачі
        ink: "#231F3A", // Основний текст
        textMuted: "#7D7896", // Приглушений текст
        danger: "#EF5B6B",
        accent: "#14B8A6", // Бірюзовий акцент
      },
    },
  },
  plugins: [],
};
