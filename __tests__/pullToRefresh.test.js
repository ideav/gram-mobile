/**
 * Детектор свайп-обновления (PULL_TO_REFRESH_JS) живёт строкой внутри
 * ViewScreen.tsx и исполняется не здесь, а в WebView. Чтобы всё-таки его
 * проверять, достаём эту строку из исходника и гоняем на заглушке DOM.
 *
 * Главное, что фиксируют проверки, — правило issue #8: обновляемся только
 * если жест начался из верхней точки, а свайп, которым страницу докручивают
 * вверх, должен упереться в начало молча.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = path.join(__dirname, '..', 'src', 'screens', 'View', 'ViewScreen.tsx');
const SCRIPT = fs
  .readFileSync(SOURCE, 'utf8')
  .match(/const PULL_TO_REFRESH_JS = `([\s\S]*?)`;/)[1];

// Порог срабатывания — 10% высоты экрана, при 800px это 80px.
const SCREEN = 800;

function element({ parent = null, scrollTop = 0, scrollHeight = 0, clientHeight = 0, overflowY = 'visible' } = {}) {
  return { nodeType: 1, parentElement: parent, scrollTop, scrollHeight, clientHeight, overflowY };
}

// injections — сколько раз скрипт инжектируется в страницу: в приложении это
// происходит на каждый onLoadEnd, обработчики при этом дублироваться не должны.
function makeEnv({ innerHeight = SCREEN, scrollY = 0, injections = 1 } = {}) {
  const handlers = {};
  const posted = [];
  const window = {
    innerHeight,
    scrollY,
    screen: { height: innerHeight },
    getComputedStyle: el => ({ overflowY: el.overflowY }),
    addEventListener: (type, fn) => {
      (handlers[type] = handlers[type] || []).push(fn);
    },
    ReactNativeWebView: { postMessage: msg => posted.push(msg) },
  };
  const document = { documentElement: { scrollTop: 0 }, body: { scrollTop: 0 } };
  window.document = document;

  const context = vm.createContext({ window, document });
  context.window = window;
  for (let i = 0; i < injections; i++) {
    vm.runInContext(SCRIPT, context);
  }

  return {
    window,
    posted,
    touchStart: (...touches) => (handlers.touchstart || []).forEach(fn => fn({ touches })),
    touchMove: (...touches) => (handlers.touchmove || []).forEach(fn => fn({ touches })),
  };
}

const touch = (target, x, y) => ({ target, clientX: x, clientY: y });

// Обычная страница: скроллится само окно.
function pageScrolledBy(scrollY) {
  const env = makeEnv({ scrollY });
  return { env, node: element({ parent: element() }) };
}

// Страница со внутренним контейнером: window.scrollY при этом всегда 0.
function containerScrolledBy(scrollTop) {
  const env = makeEnv();
  const box = element({ scrollTop, scrollHeight: 5000, clientHeight: SCREEN, overflowY: 'auto' });
  return { env, box, node: element({ parent: box }) };
}

describe('свайп-обновление срабатывает только из верхней точки', () => {
  test('страница наверху + свайп длиннее 10% экрана — обновляем', () => {
    const { env, node } = pageScrolledBy(0);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 210));
    expect(env.posted).toEqual(['__pullToRefresh']);
  });

  test('свайп короче 10% экрана — не обновляем', () => {
    const { env, node } = pageScrolledBy(0);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 150));
    expect(env.posted).toEqual([]);
  });

  test('порог считается от высоты экрана, а не фиксирован в px', () => {
    const env = makeEnv({ innerHeight: 400 });
    const node = element();
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 145)); // 45px — больше 10% от 400px
    expect(env.posted).toEqual(['__pullToRefresh']);
  });

  test('окно прокручено — свайп только докручивает страницу вверх', () => {
    const { env, node } = pageScrolledBy(300);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 400));
    expect(env.posted).toEqual([]);
  });

  test('прокручен внутренний контейнер — тоже не обновляем', () => {
    const { env, node } = containerScrolledBy(400);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 400));
    expect(env.posted).toEqual([]);
  });

  test('внутренний контейнер в верхней точке — обновляем', () => {
    const { env, node } = containerScrolledBy(0);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 400));
    expect(env.posted).toEqual(['__pullToRefresh']);
  });

  test('контейнер уехал вниз посреди жеста — жест уже не «из верхней точки»', () => {
    const { env, box, node } = containerScrolledBy(0);
    env.touchStart(touch(node, 100, 100));
    box.scrollTop = 120;
    env.touchMove(touch(node, 100, 400));
    box.scrollTop = 0;
    env.touchMove(touch(node, 100, 500));
    expect(env.posted).toEqual([]);
  });

  test('горизонтальный свайп не считается обновлением', () => {
    const { env, node } = pageScrolledBy(0);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 500, 200));
    expect(env.posted).toEqual([]);
  });

  test('два пальца — это масштабирование, а не обновление', () => {
    const { env, node } = pageScrolledBy(0);
    env.touchStart(touch(node, 100, 100), touch(node, 200, 100));
    env.touchMove(touch(node, 100, 400), touch(node, 200, 400));
    expect(env.posted).toEqual([]);
  });

  test('за один жест уходит ровно одно сообщение, следующий жест снова работает', () => {
    const { env, node } = pageScrolledBy(0);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 300));
    env.touchMove(touch(node, 100, 500));
    expect(env.posted).toHaveLength(1);

    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 300));
    expect(env.posted).toHaveLength(2);
  });

  test('повторная инъекция не вешает вторых обработчиков', () => {
    const env = makeEnv({ injections: 3 });
    const node = element();
    expect(env.window.__integramPullToRefresh).toBe(true);
    env.touchStart(touch(node, 100, 100));
    env.touchMove(touch(node, 100, 300));
    expect(env.posted).toHaveLength(1);
  });
});
