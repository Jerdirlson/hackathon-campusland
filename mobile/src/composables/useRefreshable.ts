/**
 * Estado de carga reutilizable para pull-to-refresh.
 * Con datos mock simula una recarga breve; al cablear el API `ai/`
 * aquí se dispararía el fetch real y se manejarían error/sin conexión.
 */
import { ref } from 'vue'
import type { RefresherCustomEvent } from '@ionic/vue'

export function useRefreshable() {
  const loading = ref(false)

  function refresh(ev?: RefresherCustomEvent) {
    loading.value = true
    setTimeout(() => {
      loading.value = false
      ev?.target?.complete()
    }, 900)
  }

  return { loading, refresh }
}
