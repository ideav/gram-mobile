// Официальный мок AsyncStorage для jest — без нативного модуля импорт падает
// «NativeModule: AsyncStorage is null».
module.exports = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
