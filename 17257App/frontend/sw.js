// --- 檔案：frontend/sw.js ---
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
    // 規則：API 請求 (一定要連網路，失敗就報錯)
    workbox.routing.registerRoute(
        ({url}) => url.port === '8000',
        new workbox.strategies.NetworkOnly() 
    );

    // 規則：靜態檔案 (可以從快取拿，確保 App 畫面能秒開)
    workbox.routing.registerRoute(
        ({request}) => request.destination === 'document' || request.destination === 'script' || request.destination === 'style',
        new workbox.strategies.StaleWhileRevalidate()
    );
}