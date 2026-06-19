<template>
  <ion-page>
    <ion-content class="login">
      <div class="wrap">
        <button class="back" aria-label="Volver" @click="router.replace('/login')">
          <LucideIcon name="arrow-left" :size="20" color="#fff" />
        </button>

        <div class="main">
          <div class="brand">
            <div class="logo">M</div>
            <div>
              <div class="title">Crear cuenta</div>
              <div class="subtitle">Unos datos y listo — empieza a usar Metrolínea.</div>
            </div>
          </div>

          <form class="form" @submit.prevent="register">
            <div class="field">
              <LucideIcon name="user" :size="19" color="#9AA89A" />
              <input v-model="name" type="text" placeholder="Nombre completo" autocomplete="name" required />
            </div>
            <div class="field">
              <LucideIcon name="mail" :size="19" color="#9AA89A" />
              <input v-model="email" type="email" placeholder="Correo" autocomplete="email" required />
            </div>
            <div class="field">
              <LucideIcon name="lock" :size="19" color="#9AA89A" />
              <input
                v-model="password"
                :type="showPwd ? 'text' : 'password'"
                placeholder="Contraseña (mín. 6)"
                autocomplete="new-password"
                minlength="6"
                required
              />
              <button type="button" class="eye" aria-label="Ver contraseña" @click="showPwd = !showPwd">
                <LucideIcon :name="showPwd ? 'eye-off' : 'eye'" :size="19" color="#9AA89A" />
              </button>
            </div>
            <div class="field">
              <LucideIcon name="lock" :size="19" color="#9AA89A" />
              <input
                v-model="confirm"
                :type="showPwd ? 'text' : 'password'"
                placeholder="Confirma la contraseña"
                autocomplete="new-password"
                required
              />
            </div>

            <label class="terms">
              <input v-model="acceptTerms" type="checkbox" />
              Acepto los <a @click.prevent="openTerms">términos y condiciones</a>
            </label>

            <button type="submit" class="cta" :disabled="!canSubmit">Crear cuenta</button>
          </form>

          <div class="signup">
            ¿Ya tienes cuenta?
            <button @click="router.replace('/login')">Inicia sesión</button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, alertController, toastController } from '@ionic/vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const showPwd = ref(false)
const acceptTerms = ref(false)

const canSubmit = computed(() =>
  name.value.trim().length >= 2 &&
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value) &&
  password.value.length >= 6 &&
  password.value === confirm.value &&
  acceptTerms.value,
)

async function register() {
  if (!canSubmit.value) {
    const reason =
      password.value !== confirm.value
        ? 'Las contraseñas no coinciden.'
        : 'Revisa los datos del formulario.'
    const a = await alertController.create({
      header: 'No pudimos crear la cuenta',
      message: reason,
      buttons: ['Entendido'],
    })
    return a.present()
  }

  login({ name: name.value.trim(), email: email.value.trim() })

  const t = await toastController.create({
    message: '¡Bienvenido a Metrolínea!',
    duration: 1600,
    position: 'top',
    color: 'success',
  })
  await t.present()

  router.replace('/tabs/home')
}

async function openTerms() {
  const a = await alertController.create({
    header: 'Términos y condiciones',
    message:
      'Esta es una demo del hackathon Campusland. Tus datos solo se guardan localmente en el dispositivo (localStorage). No se comparten con terceros.',
    buttons: ['Entendido'],
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
.back {
  align-self: flex-start;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 8px;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 22px;
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
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
  font-size: 30px;
  line-height: 1.05;
  letter-spacing: -0.01em;
}
.subtitle {
  font-size: 14.5px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 6px;
  line-height: 1.45;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 14px;
  padding: 13px 15px;
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
.terms {
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  margin-top: 2px;
}
.terms input { accent-color: #fff; width: 17px; height: 17px; }
.terms a { color: #fff; font-weight: 700; text-decoration: underline; cursor: pointer; }
.cta {
  width: 100%;
  background: #fff;
  color: var(--ml-green-dark);
  border: none;
  border-radius: 16px;
  padding: 16px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 16.5px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  margin-top: 6px;
  transition: 0.18s;
}
.cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.signup {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
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
