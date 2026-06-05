importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Fetch the config via URL params or hardcode it since it's a fixed project for now.
// For robust usage in production, use a proper bundler or fetch config dynamically.
// However, Firebase Messaging needs initializeApp. We can use a trick or simply initialize an empty app if we just want token generation to work (sometimes it needs it).
// Since we don't have the full config statically without exposing it, we'll just initialize it with the projectId and messagingSenderId.

firebase.initializeApp({
  projectId: "gen-lang-client-0067440127",
  messagingSenderId: "75983263360"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Match Update';
  const notificationOptions = {
    body: payload.notification?.body || 'A match score has been updated.',
    icon: '/trophy.png' // We don't have one but it'll fallback
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
