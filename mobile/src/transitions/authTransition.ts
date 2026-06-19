import { createAnimation, mdTransitionAnimation } from '@ionic/vue'
import type { Animation } from '@ionic/vue'

/**
 * Transición tipo Apple ("fade through") para las pantallas de entrada
 * (onboarding ↔ login ↔ register). Como todas comparten el mismo gradiente
 * verde, el fondo se siente continuo y solo el contenido hace cross-dissolve
 * con un leve desplazamiento + escala, igual que los onboardings de iOS.
 *
 * Para cualquier otra navegación se delega en la animación por defecto de
 * Ionic (md), así que las pantallas de detalle conservan su slide nativo.
 */
type TransitionOpts = {
  enteringEl: HTMLElement
  leavingEl?: HTMLElement
  direction?: 'forward' | 'back'
}

const isAuthPage = (el?: HTMLElement | null) => !!el && el.hasAttribute('data-auth')
const isAlertPage = (el?: HTMLElement | null) => !!el && el.hasAttribute('data-alert')

export const authTransition = (baseEl: HTMLElement, opts: TransitionOpts): Animation => {
  const { enteringEl, leavingEl, direction } = opts

  // Transición slide-up suave para páginas de alerta/reporte.
  if (isAlertPage(enteringEl) || isAlertPage(leavingEl)) {
    const back = direction === 'back'
    const springEase = 'cubic-bezier(0.32, 0.72, 0, 1)'

    const root = createAnimation().addElement(baseEl)

    if (!back) {
      const enter = createAnimation()
        .addElement(enteringEl)
        .beforeStyles({ 'z-index': '101' })
        .beforeClearStyles(['opacity', 'transform'])
        .duration(250)
        .easing(springEase)
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateY(24px)', 'translateY(0px)')
      root.addAnimation(enter)

      if (leavingEl) {
        const leave = createAnimation()
          .addElement(leavingEl)
          .beforeStyles({ 'z-index': '100' })
          .duration(180)
          .easing('ease-out')
          .fromTo('opacity', '1', '0')
        root.addAnimation(leave)
      }
    } else {
      const enter = createAnimation()
        .addElement(enteringEl)
        .beforeStyles({ 'z-index': '100' })
        .beforeClearStyles(['opacity', 'transform'])
        .duration(200)
        .easing(springEase)
        .fromTo('opacity', '0', '1')
      root.addAnimation(enter)

      if (leavingEl) {
        const leave = createAnimation()
          .addElement(leavingEl)
          .beforeStyles({ 'z-index': '101' })
          .duration(200)
          .easing('ease-out')
          .fromTo('opacity', '1', '0')
          .fromTo('transform', 'translateY(0px)', 'translateY(24px)')
        root.addAnimation(leave)
      }
    }

    return root
  }

  // Solo aplicamos el fade-through cuando ambas pantallas son de auth.
  if (!isAuthPage(enteringEl) || !isAuthPage(leavingEl)) {
    return mdTransitionAnimation(baseEl, opts as never)
  }

  const back = direction === 'back'
  const enterFrom = back ? -20 : 20
  const leaveTo = back ? 16 : -16
  const easing = 'cubic-bezier(0.32, 0.72, 0, 1)' // curva spring de iOS

  const enter = createAnimation()
    .addElement(enteringEl)
    .beforeStyles({ 'z-index': '101' })
    .beforeClearStyles(['opacity', 'transform'])
    .duration(460)
    .easing(easing)
    .fromTo('opacity', '0', '1')
    .fromTo(
      'transform',
      `translateY(${enterFrom}px) scale(0.98)`,
      'translateY(0px) scale(1)',
    )

  const root = createAnimation()
    .addElement(baseEl)
    .addAnimation(enter)

  if (leavingEl) {
    const leave = createAnimation()
      .addElement(leavingEl)
      .beforeStyles({ 'z-index': '100' })
      .duration(300)
      .easing('ease-out')
      .fromTo('opacity', '1', '0')
      .fromTo(
        'transform',
        'translateY(0px) scale(1)',
        `translateY(${leaveTo}px) scale(0.99)`,
      )
    root.addAnimation(leave)
  }

  return root
}
