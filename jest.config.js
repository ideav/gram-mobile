module.exports = {
  preset: 'react-native',
  // Эти пакеты поставляются в ESM — без преобразования jest падает
  // «SyntaxError: Unexpected token 'export'» ещё на импорте App.tsx.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|react-native-screens|react-native-safe-area-context|@react-native-async-storage|react-native-webview)/)',
  ],
};
