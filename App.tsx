import { StatusBar } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import APP_LINK from './src/config/Links';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import ViewScreen from './src/screens/View/ViewScreen';

function App() {
  // const isDarkMode = useColorScheme() === 'dark';
  const isDarkMode = false;

  const Stack = createNativeStackNavigator();

  const linking = {
    prefixes: ['https://ideav.ru'],
    config: {
      screens: {
        View: {
          path: '*',
        }
      },
    },
    getStateFromPath: (path) => {
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
          <Stack.Screen name="View" component={ViewScreen} initialParams={{ initialUrl: null }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
