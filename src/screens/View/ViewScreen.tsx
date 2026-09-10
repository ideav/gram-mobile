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
//
// Обновляемся только если жест начался ровно из верхней точки (issue #8): свайп,
// которым страницу докручивают вверх, должен упереться в начало и ничего не
// перезагрузить. Поэтому «мы наверху» проверяется в момент touchstart и потом
// ещё раз на каждом touchmove — если контейнер за время жеста уехал вниз,
// жест уже не «из верхней точки».
const PULL_TO_REFRESH_JS = `
(function() {
  if (window.__integramPullToRefresh) return true;
  window.__integramPullToRefresh = true;
  // Величина овер-скролла для срабатывания — 10% высоты экрана (issue #8).
  // Считаем на каждый жест: поворот экрана меняет innerHeight.
  var threshold = function() {
    return (window.innerHeight || (window.screen && window.screen.height) || 600) * 0.1;
  };
  // Прокручиваемые предки точки касания. Страница может скроллиться не окном,
  // а внутренним контейнером — тогда window.scrollY всегда 0 и «мы на самом
  // верху» было бы вечно истинным. Собираем список один раз на touchstart:
  // getComputedStyle на каждом touchmove — слишком дорого.
  var scrollersOf = function(el) {
    var list = [];
    for (; el && el.nodeType === 1; el = el.parentElement) {
      var oy = window.getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 1) {
        list.push(el);
      }
    }
    return list;
  };
  var atTop = function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].scrollTop > 0) return false;
    }
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0;
  };
  var startY = 0, startX = 0, scrollers = [], armed = false, fired = false;
  window.addEventListener('touchstart', function(e) {
    var touch = e.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
    scrollers = scrollersOf(touch.target);
    armed = e.touches.length === 1 && atTop(scrollers);
    fired = false;
  }, {passive: true, capture: true});
  window.addEventListener('touchmove', function(e) {
    if (!armed || fired) return;
    // Мультитач — это масштабирование, а не свайп-обновление.
    if (e.touches.length !== 1) { armed = false; return; }
    if (!atTop(scrollers)) { armed = false; return; }
    var dy = e.touches[0].clientY - startY;
    var dx = e.touches[0].clientX - startX;
    // Вертикальный свайп вниз заметно длиннее горизонтали — не мешаем
    // горизонтальным жестам внутри страницы.
    if (dy > threshold() && dy > Math.abs(dx) * 2) {
      fired = true;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('__pullToRefresh');
    }
  }, {passive: true, capture: true});
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
