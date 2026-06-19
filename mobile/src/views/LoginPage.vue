<template>
  <ion-page>
    <ion-content class="login">
      <div class="wrap">
        <div class="main">
          <div class="brand">
            <MlLogo :height="42" on-dark />
            <div>
              <div class="title">Hola de nuevo</div>
              <div class="subtitle">Ingresa para ver tus buses en tiempo real.</div>
            </div>
          </div>

          <form class="form" @submit.prevent="login">
            <div class="field">
              <LucideIcon name="mail" :size="19" color="#9AA89A" />
              <input v-model="email" type="text" placeholder="Correo o celular" />
            </div>
            <div class="field">
              <LucideIcon name="lock" :size="19" color="#9AA89A" />
              <input v-model="password" :type="showPwd ? 'text' : 'password'" placeholder="Contraseña" />
              <button type="button" class="eye" aria-label="Ver contraseña" @click="showPwd = !showPwd">
                <LucideIcon :name="showPwd ? 'eye-off' : 'eye'" :size="19" color="#9AA89A" />
              </button>
            </div>
            <button type="button" class="forgot" @click="forgotPassword">¿Olvidaste tu contraseña?</button>

            <button type="submit" class="cta">Ingresar</button>
          </form>

          <div class="divider">
            <span class="line"></span>
            <span class="or">o continúa con</span>
            <span class="line"></span>
          </div>

          <div class="social">
            <button class="social-btn" @click="login">
              <span class="g">G</span>Google
            </button>
            <button class="social-btn" @click="login">
              <svg
                class="apple"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="#fff"
                aria-hidden="true"
              >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </button>
          </div>
        </div>

        <div class="signup">
          ¿No tienes cuenta?
          <button @click="router.push('/register')">Crear cuenta</button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, alertController, toastController } from '@ionic/vue'
import LucideIcon from '@/components/LucideIcon.vue'
import MlLogo from '@/components/MlLogo.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login: doLogin } = useAuth()
const email = ref('')
const password = ref('')
const showPwd = ref(false)

function login() {
  doLogin({
    name: 'Juan Sánchez',
    email: email.value || 'juan@metrolinea.co',
  })
  router.replace('/tabs/home')
}

async function forgotPassword() {
  const a = await alertController.create({
    header: 'Recuperar contraseña',
    message: 'Te enviaremos un enlace de recuperación al correo que nos indiques.',
    inputs: [
      {
        name: 'email',
        type: 'email',
        placeholder: 'tu@correo.com',
        value: email.value,
        attributes: { autocomplete: 'email' },
      },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Enviar enlace',
        handler: async (data: { email: string }) => {
          const value = (data?.email || '').trim()
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
            const err = await alertController.create({
              header: 'Correo inválido',
              message: 'Ingresa un correo válido.',
              buttons: ['Entendido'],
            })
            await err.present()
            return false
          }
          const t = await toastController.create({
            message: `Si ${value} está registrado, te llegará un correo en unos minutos.`,
            duration: 2400,
            position: 'top',
            color: 'success',
          })
          await t.present()
          return true
        },
      },
    ],
  })
  await a.present()
}
</script>

<style scoped>
.login {
  --background: radial-gradient(120% 80% at 70% 0%, #7fcb38 0%, #5aa621 45%, #3f7a14 100%);
}
.wrap {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 14px) 28px calc(env(safe-area-inset-bottom) + 24px);
  color: #fff;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
}
.logo {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 30px;
}
.title {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 32px;
  line-height: 1.05;
  letter-spacing: -0.01em;
}
.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.88);
  margin-top: 6px;
  line-height: 1.45;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 14px;
  padding: 14px 15px;
}
.field input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-family: var(--ml-font-body);
  font-size: 15px;
  color: var(--ml-ink);
  min-width: 0;
}
.eye {
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  padding: 0;
}
.forgot {
  align-self: flex-end;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.92);
  font-family: var(--ml-font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
}
.cta {
  width: 100%;
  background: #fff;
  color: var(--ml-green-dark);
  border: none;
  border-radius: 16px;
  padding: 17px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 17px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  margin-top: 4px;
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
}
.line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
}
.or {
  font-family: var(--ml-font-mono);
  font-size: 11px;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
}
.social {
  display: flex;
  gap: 12px;
}
.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  padding: 13px;
  color: #fff;
  font-family: var(--ml-font-body);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}
.g {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 13px;
  color: var(--ml-green-dark);
}
.apple {
  margin-top: -2px; /* el logo de Apple tiene baseline raro, alinear con el texto */
}
.signup {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 18px;
}
.signup button {
  border: none;
  background: none;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-size: 14px;
  text-decoration: underline;
}
</style>
