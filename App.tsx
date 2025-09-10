import { Image, Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableHighlight, useColorScheme, useWindowDimensions, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ThemedText, useTheme } from './src/theme/Theme';
import Links from './src/config/Links';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef, getStateFromPath, NavigationContainer } from '@react-navigation/native';
import MainScreen from './src/screens/Main/MainScreen';
import ViewScreen from './src/screens/View/ViewScreen';
import { useEffect, useState } from 'react';
import APP_LINK from './src/config/Links';

function App() {
  // const isDarkMode = useColorScheme() === 'dark';
  const isDarkMode = false;

  const Stack = createNativeStackNavigator();

  const [initialUrl, setInitialUrl] = useState<null | string>(null);
  const linking = {
    prefixes: ['https://app.integram.io'],
    config: {
      screens: {
        View: {
          path: '*',
        }
      },
    },
    getStateFromPath: (path, config) => {
      return {
        routes: [
          {
            name: 'View',
            params: { initialUrl: APP_LINK + path },
          },
        ],
      }
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName='View'
        >
          <Stack.Screen name="View" component={ViewScreen} initialParams={{ initialUrl }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
