# gram-mobile — мобильное приложение Интеграм (ideav.ru)

React Native-обёртка (WebView) над веб-версией Интеграма на `https://ideav.ru`.
Зачем: в мобильном браузере шапку браузера не скрыть (см.
[ideav/crm#4921](https://github.com/ideav/crm/issues/4921)) — в приложении её нет,
веб-интерфейс занимает весь экран.

## Как работает

- `App.tsx` — один экран `ViewScreen`: WebView, стартующий с `https://ideav.ru`
  (`src/config/Links.ts` → `APP_LINK`), последнюю открытую страницу запоминает в
  AsyncStorage (`lastUrl`).
- Аппаратная «назад» ведёт себя как в браузере: шаг назад по истории WebView, а на
  корне — выход из приложения.
- Свайп сверху вниз перезагружает страницу, как в браузере. На iOS это делает сам
  WebView (`pullToRefreshEnabled`), на Android такого пропа нет — там WebView обёрнут
  в `ScrollView` с `RefreshControl`, и жест включён только когда страница на самом
  верху (см. issue #4).
- Перед загрузкой страницы в неё инжектится `document.isMobileApp = true` — флаг,
  по которому веб-интерфейс может адаптироваться под приложение.
- Диплинки: открыть `https://ideav.ru/…` из другого приложения — откроется в этом
  приложении (Android App Links, `autoVerify`).

## Сборка

```sh
npm install
npm start          # Metro
npm run android    # Android (эмулятор/устройство)
npm run ios        # iOS (macOS, сперва: bundle install && bundle exec pod install)
```

## Android App Links

Чтобы диплинки `https://ideav.ru/…` открывались приложением без выбора,
`src/config/assetlinks.json` (package `com.integram.mobile` + отпечаток подписи)
должен отдаваться по `https://ideav.ru/.well-known/assetlinks.json` — см. issue #1.
