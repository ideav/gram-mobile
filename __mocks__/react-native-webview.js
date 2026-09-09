// react-native-webview дергает TurboModuleRegistry.getEnforcing('RNCWebViewModule')
// на импорте — в jest нативного модуля нет. Ручной мок подхватывается автоматически
// (каталог __mocks__ рядом с node_modules).
const React = require('react');

module.exports = {
  __esModule: true,
  default: React.forwardRef(() => null),
};
