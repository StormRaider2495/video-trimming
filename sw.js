/*
 *
 *  Device Framers
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
// verison 1

const cacheName = "::VideoTrimmingServiceWorker";
const version = "v0.0.3";

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(version + cacheName).then(cache => {
            return cache.addAll([
                './index.html',
                './css/main.css',
                './scripts/ffmpeg.js',
                './scripts/ffmpeg-worker-mp4.js',
                "https://raw.githubusercontent.com/StormRaider2495/video-trimming/master/scripts/ffmpeg-worker-mp4.js"
            ])
                .then(() => self.skipWaiting());
        })
    )
});

// self.addEventListener('activate',  event => {
//   event.waitUntil(self.clients.claim());
// });

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            // Remove caches whose name is no longer valid
            return Promise.all(
                keys
                    .filter((key) => {
                        return key.indexOf(version) !== 0;
                    })
                    .map((key) => {
                        return caches.delete(key);
                    })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(version + cacheName).then(cache => {
            return cache.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        })
    );
});

// self.addEventListener("onupdatefound", (registration) => {
//   console.log("Content version update found")
//   const installingWorker = registration.installing;
//   if (installingWorker) {
//     console.log("installingWorker")
//     installingWorker.onstatechange = () => {
//       if (installingWorker.state === 'installed') {
//         if (navigator.serviceWorker.controller) {
//           // At this point, the old content will have been purged and
//           // the fresh content will have been added to the cache.
//           // It's the perfect time to display a 'New content is
//           // available; please refresh.' message in your web app.
//           console.log('New content is available; please refresh.');
//         } else {
//           // At this point, everything has been precached.
//           // It's the perfect time to display a
//           // 'Content is cached for offline use.' message.
//           console.log('Content is cached for offline use.');
//         }
//       }
//     };
//   } else {
//     // Installation is not happening. Already latest content is being served.
//     console.log('Service worker already register');
//   }
// });