<script setup lang="ts">
definePageMeta({
  colorMode: "dark",
  layout: "x",
});

const debug = useDebug('confirm')
// const user = useSupabaseUser()
const client = useSupabaseClient()

const postInvite = async (refId: string, reason: string) => {
  try {
    const rz = await doFetch('/api/invite/updateRefId', {
      method: 'POST',
      body: {
        refId,
        reason,
      }
    })
    debug({ rz })
  } catch (error) {
    debug({ error })
  }
}

// watch(user, async () => {
//   if (user.value) {
//     const params = new URLSearchParams(location.search);
//     let redirectTo = params.get("redirectTo") || '/';
//     redirectTo = redirectTo.replace('[uid]', user.value.id)
//     const refId = params.get("refId") || '';
//     const reason = params.get("reason") || '';
//     debug({ refId, reason, user: user.value, redirectTo })
//     postInvite(refId, reason)
//     return navigateTo(redirectTo)
//   }
// }, { immediate: true })

let authListener: any;
let isEmite = false;
onMounted(() => {
  const rz = client.auth.onAuthStateChange(
    (event, session) => {
      console.log('event:', event);
      console.log('session:', session);

      if (session) {
        if (isEmite) {
          return;
        }
        isEmite = true;
        const user = session.user;
        console.log('user ID:', user.id);
        console.log('user email:', user.email);
        const params = new URLSearchParams(location.search);
        let pathname = params.get("pathname") || '/';
        pathname = pathname.replace('[uid]', user.id)
        const refId = params.get("refId") || '';
        const reason = params.get("reason") || '';
        debug({ refId, reason, user, pathname })
        console.log({ refId, reason, user, pathname, params })
        postInvite(refId, reason)
        return navigateTo(pathname)
      }
    }
  );
  authListener = rz.data;
})

onUnmounted(() => {
  authListener.subscription.unsubscribe();
})
</script>

<template>
  <article class="w-full h-full flex flex-col items-center justify-center space-y-8 px-8">
    Redirecting...
  </article>
</template>
