import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import APP_LINK from "../../config/Links";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Свайп сверху вниз = перезагрузка страницы, как в браузере.
// На iOS это умеет сам WebView (проп pullToRefreshEnabled). На Android такого
// пропа нет, а RefreshControl вокруг WebView не срабатывает — WebView забирает
// жест себе, и до RefreshControl он не доходит (issue #6, см. также
// react-native-webview#103). Поэтому на Android жест ловит сама страница:
// инжектированный детектор overscroll (PULL_TO_REFRESH_JS) шлёт сообщение в RN,
// а RN перезагружает страницу и показывает свой индикатор поверх WebView.
const HAS_NATIVE_PULL_TO_REFRESH = Platform.OS === 'ios';

// Детектор «страница на самом верху + потянули вниз». Идемпотентен: повторная
// инъекция после каждой загрузки (onLoadEnd) не плодит дубликаты обработчиков.
const PULL_TO_REFRESH_JS = `
(function() {
  if (window.__integramPullToRefresh) return true;
  window.__integramPullToRefresh = true;
  var THRESHOLD = 70; // px свайпа вниз для срабатывания
  var startY = 0, startX = 0, atTop = false, fired = false;
  var pageTop = function() {
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0;
  };
  window.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    atTop = pageTop();
    fired = false;
  }, {passive: true});
  window.addEventListener('touchmove', function(e) {
    if (!atTop || fired) return;
    var dy = e.touches[0].clientY - startY;
    var dx = e.touches[0].clientX - startX;
    // Вертикальный свайп вниз заметно длиннее горизонтали — не мешаем
    // горизонтальным жестам внутри страницы.
    if (dy > THRESHOLD && dy > Math.abs(dx) * 2) {
      fired = true;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('__pullToRefresh');
    }
  }, {passive: true});
  return true;
})();
`;

// «Номер и дата сборки» для штампа в правом нижнем углу (issue #6).
// versionName/versionCode прошиваются при сборке в CI (android/app/build.gradle).
function buildStamp() {
  const c = Platform.constants;
  if (c && c.appVersion) return String(c.appVersion);
  if (c && c.buildVersion) return `build ${c.buildVersion}`;
  return 'dev';
}

const ViewScreen = ({ route, navigation }) => {
  const { initialUrl } = route.params;
  const source = { uri: APP_LINK };
  const [currentUrl, setCurrentUrl] = React.useState({ uri: '' });
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();
  const webViewRef = React.useRef(null);

  useEffect(() => {
    if (initialUrl) {
      setCurrentUrl({ uri: initialUrl });
    } else {
      AsyncStorage.getItem('lastUrl').then(lastUrl => {
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

  const reload = React.useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
  }, []);

  const onMessage = React.useCallback((e) => {
    if (e.nativeEvent.data === '__pullToRefresh') {
      reload();
    }
  }, [reload]);

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
      injectedJavaScript={HAS_NATIVE_PULL_TO_REFRESH ? undefined : PULL_TO_REFRESH_JS}
      onMessage={onMessage}
      onLoadStart={(e) => {
        // webViewRef.current?.injectJavaScript(blockingScript);
        setCanGoBack(e.nativeEvent.canGoBack);
      }}
      onLoadProgress={(e) => {
        // console.log('canGoBack', e.nativeEvent.canGoBack)
      }}
      onLoadEnd={(e) => {
        setRefreshing(false);
        if (!HAS_NATIVE_PULL_TO_REFRESH) {
          // Детектор должен жить и на странице с ошибкой (нет сети) — там
          // свайп-обновление нужнее всего, а injectedJavaScript туда не доходит.
          webViewRef.current?.injectJavaScript(PULL_TO_REFRESH_JS);
        }
      }}
      onError={(e) => {
        setRefreshing(false);
      }}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo
      allowsPictureInPictureMediaPlayback
      allowsInlineMediaPlayback
      javaScriptEnabled
      cacheEnabled
      pullToRefreshEnabled
    />
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {webView}
      {refreshing && !HAS_NATIVE_PULL_TO_REFRESH && (
        <ActivityIndicator style={styles.spinner} size="small" />
      )}
      <View pointerEvents="none" style={styles.stampBox}>
        <Text style={styles.stamp}>{buildStamp()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  spinner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
  },
  stampBox: {
    position: 'absolute',
    right: 10,
    bottom: 2,
  },
  // «Почти прозрачные цифры» — водяной знак, не мешает контенту страницы.
  stamp: {
    fontSize: 10,
    color: 'rgba(127,127,127,0.28)',
  },
});

export default ViewScreen;
