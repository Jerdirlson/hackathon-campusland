/** Contenido de las pantallas de onboarding (estático, parte del producto). */

export interface OnboardingSlide {
  eye: string
  title: string
  body: string
  cta: string
  icon: string
}

export const ONB: OnboardingSlide[] = [
  {
    eye: 'Bienvenido',
    title: 'Metrolínea en tu mano',
    body: 'Mira en tiempo real cuándo llega tu próximo bus, qué tan lleno viene y planea tu viaje sin sorpresas.',
    cta: 'Continuar',
    icon: 'bus-front',
  },
  {
    eye: 'En vivo',
    title: 'Cero minutos de espera ciega',
    body: 'Cámaras a bordo cuentan los pasajeros y la app te avisa si tu ruta está saturada.',
    cta: 'Siguiente',
    icon: 'gauge',
  },
  {
    eye: 'Listo',
    title: 'Empieza ahora',
    body: 'Crea tu cuenta o inicia sesión y guarda tus paradas favoritas en segundos.',
    cta: 'Empezar',
    icon: 'check',
  },
]
