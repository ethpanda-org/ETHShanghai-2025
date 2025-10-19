<template>
  <ConfigLoad />
  <div class="w-full min-h-dvh bg">
    <Navigation />
    <div>
      <slot />
    </div>
    <!-- <TabBar /> -->
  </div>
</template>

<style scoped>
.bg {
  background: #141414;
  background-image:
    radial-gradient(
      ellipse 80% 40% at 90% -20%,
      var(--turing-purple-color),
      transparent
    ),
    radial-gradient(
      ellipse 200% 20% at -90% 99%,
      var(--turing-purple-color),
      transparent
    );
}
</style>
