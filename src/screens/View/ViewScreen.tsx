import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect } from "react";
import { BackHandler, Platform, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import APP_LINK from "../../config/Links";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Свайп сверху вниз = перезагрузка страницы, как в браузере.
// На iOS это умеет сам WebView (проп pullToRefreshEnabled), на Android этого
// пропа нет — там оборачиваем WebView в ScrollView с RefreshControl.
const HAS_NATIVE_PULL_TO_REFRESH = Platform.OS === 'ios';

const ViewScreen = ({ route, navigation }) => {
  const { initialUrl } = route.params;
  const source = { uri: APP_LINK };
  const [currentUrl, setCurrentUrl] = React.useState({ uri: '' });
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  // RefreshControl срабатывает, когда его ребёнок (ScrollView) не может
  // прокрутиться вверх, а он не может никогда — высота содержимого равна экрану.
  // Поэтому жест разрешаем только пока сама страница в WebView стоит на самом
  // верху, иначе потяг вниз посреди страницы перезагружал бы её вместо скролла.
  const [atPageTop, setAtPageTop] = React.useState(true);
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
  }, []);

  const webView = (
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
        // Новая страница открывается сверху, а onScroll на ней ещё не приходил.
        setAtPageTop(true);
      }}
      onLoadProgress={(e) => {
        // console.log('canGoBack', e.nativeEvent.canGoBack)
      }}
      onLoadEnd={(e) => {
        setRefreshing(false);
      }}
      onError={(e) => {
        // Иначе индикатор крутился бы вечно на неудачной перезагрузке.
        setRefreshing(false);
      }}
      onScroll={(e) => {
        const top = e.nativeEvent.contentOffset.y <= 0;
        setAtPageTop(prev => (prev === top ? prev : top));
      }}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo
      allowsPictureInPictureMediaPlayback
      allowsInlineMediaPlayback
      javaScriptEnabled
      cacheEnabled
      pullToRefreshEnabled
      nestedScrollEnabled
    />
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {HAS_NATIVE_PULL_TO_REFRESH ? webView : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={atPageTop}
            />
          }
        >
          {webView}
        </ScrollView>
      )}
    </View>
  );
};

export default ViewScreen;
