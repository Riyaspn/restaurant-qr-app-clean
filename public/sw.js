/* public/sw.js */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'New order'
  const body = data.body || 'A new order just arrived.'
  const icon = '/icons/maskable-192.png' // supply your icon
  const tag = data.tag || 'orders'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/badge-72.png',
      tag,
      data: data.data || {},
      renotify: true,
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/owner/orders'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
    const had = clientsArr.find(c => c.url.includes('/owner/orders'))
    if (had) return had.focus()
    return clients.openWindow(url)
  }))
})
