self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('review-v1').then(function (cache) {
            return cache.addAll([
                '/index.html',
                '/restaurant.html',
                '/assets/css/main.css',
                '/assets/js/idb.js',
                '/assets/js/main.js',
                '/assets/js/dbhelper.js',
                '/assets/js/restaurant_info.js',
                '/assets/img/1.jpg',
                '/assets/img/2.jpg',
                '/assets/img/3.jpg',
                '/assets/img/4.jpg',
                '/assets/img/5.jpg',
                '/assets/img/6.jpg',
                '/assets/img/7.jpg', 
                '/assets/img/8.jpg',
                '/assets/img/9.jpg',
                '/assets/img/10.jpg',
                '/manifest.json',
                'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css',
            ]); 
        })   
    );   
});

self.addEventListener('fetch', function (event) {
    var requestUrl = new URL(event.request.url); 
    if (requestUrl.pathname.startsWith("/restaurant.html")) {
        event.respondWith(caches.match('/restaurant.html').then((response)=>{
            return response || fetch(event.request);
        }));
        return;
    }
    if (requestUrl.pathname === '/') {
        event.respondWith(caches.match('/index.html').then((response) => {
            return response || fetch(event.request);
        }));
        return;
    }
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        }) 
    );
});