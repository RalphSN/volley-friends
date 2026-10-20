import { Suspense, lazy } from 'react'

// 多版並存：預設是原版（排球圖鑑），?v=2 是記分表版，?v=3 是新野獸派版；各版拆成獨立 chunk
const VERSION_LOADERS = {
  2: () => import('./v2/App.jsx'),
  3: () => import('./v3/App.jsx'),
}
const requestedVersion = new URLSearchParams(window.location.search).get('v')
const loadApp = VERSION_LOADERS[requestedVersion] || (() => import('./App.jsx'))
const VersionedApp = lazy(loadApp)

export default function AppSwitch() {
  return (
    <Suspense fallback={null}>
      <VersionedApp />
    </Suspense>
  )
}
