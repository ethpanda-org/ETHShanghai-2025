gsap.set("svg", {
  opacity: 1,
  rotation: -20,
  transformOrigin: "center center"
});

let tl = gsap.timeline();

let lines = gsap.utils.toArray("svg > g");

tl.from(
  lines,
  {
    opacity: 0,
    duration: 1,
    ease: "power3.out",
    stagger: 0.06
  },
  0
)
  .from(
    ".cross",
    {
      rotation: -800,
      opacity: 0,
      scale: 0,
      transformOrigin: "center center",
      ease: "expo.out",
      stagger: 0.01
    },
    0
  )
  .from(
    ".left",
    {
      xPercent: -20,
      duration: 12,
      ease: "expo.out"
    },
    0
  )
  .from(
    ".right",
    {
      xPercent: 20,
      duration: 12,
      ease: "expo.out"
    },
    0
  )
  .to(
    ".cross",
    {
      rotation: 360,
      opacity: 0,
      transformOrigin: "center center",
      ease: "expo.out",
      stagger: {
        from: "center",
        amount: 0.3
      }
    },
    1.5
  )
  .to(
    ".webflow",
    {
      opacity: 0,
      scale: 0.8,
      transformOrigin: "center",
      duration: 0.3,
      stagger: {
        from: "end",
        amount: 0.4
      }
    },
    1.5
  );
tl.to(
  ".gsap",
  {
    opacity: 0,
    scale: 0.8,
    transformOrigin: "center",
    duration: 0.3,
    stagger: {
      from: "start",
      amount: 0.4
    }
  },
  1.5
);

document.body.addEventListener("click", (e) => {
  tl.timeScale(0.7).play(0);
});
