import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect } from "react";
import { BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import APP_LINK from "../../config/Links";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ViewScreen = ({ route, navigation }) => {
  const { initialUrl } = route.params;
  const source = { uri: APP_LINK };
  const [currentUrl, setCurrentUrl] = React.useState({ uri: '' });
  const [canGoBack, setCanGoBack] = React.useState(false);
  const insets = useSafeAreaInsets();
  const webViewRef = React.useRef(null);

  useEffect(() => {
    if (initialUrl) {
      setCurrentUrl({ uri: initialUrl });
    } else {
      AsyncStorage.getItem('lastUrl').then(lastUrl => {
        console.log(lastUrl);
        if (!lastUrl || lastUrl === 'about:blank') {
          setCurrentUrl(source);
        } else {
          setCurrentUrl({ uri: lastUrl });
        }
      })
    }
  }, [route]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (webViewRef.current) {
          if (!canGoBack) {
            BackHandler.exitApp();
          } else {
            webViewRef.current.goBack();
          }
          return true;
        } else {
          return false;
        }

      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [currentUrl.uri])
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <WebView
        source={currentUrl}
        ref={webViewRef}
        style={{ flex: 1 }}
        onSourceChanged={(e) => {
          // console.log(e.nativeEvent.url);
        }}
        onNavigationStateChange={async (e) => {
          // console.log('aaa', e.url);
          setCurrentUrl({ uri: e.url });
          await AsyncStorage.setItem('lastUrl', e.url);
        }}
        injectedJavaScriptBeforeContentLoaded="document.isMobileApp = true;"
        onLoadStart={(e) => {
          // webViewRef.current?.injectJavaScript(blockingScript);
          setCanGoBack(e.nativeEvent.canGoBack);
        }}
        onLoadProgress={(e) => {
          // console.log('canGoBack', e.nativeEvent.canGoBack)
        }}
        onLoadEnd={(e) => {
          // console.log('onLoadEnd');
        }}
        onError={(e) => {
          // console.log(e.nativeEvent.url);
        }}
        setSupportMultipleWindows={false}
        allowsFullscreenVideo
        allowsPictureInPictureMediaPlayback
        allowsInlineMediaPlayback
        javaScriptEnabled
        cacheEnabled
        pullToRefreshEnabled
      />
    </View>
  );
};

export default ViewScreen;