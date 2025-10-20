'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import * as htmlToImage from 'html-to-image';
import './style.css';

// 注册GSAP插件
gsap.registerPlugin(Draggable, InertiaPlugin);

interface PosterProps {
  className?: string;
}

const gradients = [
  "--gradient-macha",
  "--gradient-orange-crush", 
  "--gradient-lipstick",
  "--gradient-purple-haze",
  "--gradient-skyfall",
  "--gradient-emerald-city",
  "--gradient-summer-fair"
];

const circleColors = [
  "--color-shockingly-green",
  "--color-surface-white",
  "--color-pink",
  "--color-shockingly-pink",
  "--color-orangey",
  "--color-lilac",
  "--color-lt-green",
  "--color-blue"
];

const letterColors = [
  "--grey-dark",
  "--light",
  "--green",
  "--green-dark",
  "--green-light",
  "--blue",
  "--purple",
  "--red",
  "--orange"
];

export default function Poster({ className = '' }: PosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const smooothContainerRef = useRef<HTMLDivElement>(null);
  const smooothRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const pauseBtnRef = useRef<HTMLButtonElement>(null);
  const screenshotBtnRef = useRef<HTMLButtonElement>(null);
  const rerollBtnRef = useRef<HTMLButtonElement>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  const getCSSVarValue = (varName: string): string => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  };

  const getRandomItem = <T,>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const randomizeVisuals = () => {
    if (!posterRef.current || !circleRef.current || !stickerRef.current || !smooothRef.current) return;

    // Background
    const gradientValue = getCSSVarValue(getRandomItem(gradients));
    if (posterRef.current) {
      posterRef.current.style.background = gradientValue;
    }

    // Circle
    if (circleRef.current) {
      circleRef.current.style.backgroundColor = getCSSVarValue(getRandomItem(circleColors));
    }

    // Sticker
    if (stickerRef.current) {
      const excluded = [5, 9, 24, 27];
      const validFlairs = Array.from({ length: 35 }, (_, i) => i + 1).filter(
        (i) => !excluded.includes(i)
      );
      const flairNumber = getRandomItem(validFlairs);
      const flairClass = flairNumber === 1 ? "flair" : `flair--${flairNumber}`;

      // Remove all flair classes
      stickerRef.current.classList.remove(
        "flair",
        ...Array.from({ length: 35 }, (_, i) => `flair--${i + 1}`)
      );
      stickerRef.current.classList.add(flairClass);
    }

    // Letters
    if (smooothRef.current) {
      smooothRef.current.style.color = getCSSVarValue(getRandomItem(letterColors));
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleScreenshot = async () => {
    if (!posterRef.current || !controlsRef.current || !smooothContainerRef.current || !logoRef.current) return;

    setIsScreenshotMode(true);
    
    // Hide controls and adjust layout for screenshot
    controlsRef.current.style.display = "none";
    smooothContainerRef.current.style.display = "none";

    Object.assign(logoRef.current.style, {
      width: "300px",
      maxWidth: "none",
      top: "auto",
      bottom: "7%"
    });

    Object.assign(posterRef.current.style, {
      width: "1290px",
      height: "2796px"
    });

    if (stickerRef.current) {
      Object.assign(stickerRef.current.style, {
        width: "484px",
        height: "484px",
        maxWidth: "none",
        maxHeight: "none"
      });
    }

    if (circleRef.current) {
      Object.assign(circleRef.current.style, {
        width: "968px",
        height: "968px",
        maxWidth: "none",
        maxHeight: "none"
      });
    }

    try {
      const dataUrl = await htmlToImage.toPng(posterRef.current);
      const link = document.createElement("a");
      link.download = "gsap-smoooth-poster_randomizer.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Screenshot failed:", error);
    } finally {
      // Reset layout
      if (controlsRef.current) controlsRef.current.style.removeProperty("display");
      if (smooothContainerRef.current) smooothContainerRef.current.style.removeProperty("display");
      
      gsap.set([logoRef.current, posterRef.current, stickerRef.current, circleRef.current], {
        clearProps: "width,height,maxWidth,maxHeight"
      });
      gsap.set(logoRef.current, { clearProps: "top,bottom" });
      
      setIsScreenshotMode(false);
    }
  };

  useEffect(() => {
    if (!posterRef.current || !smooothRef.current) return;

    const initialRotationOffset = -36.25;
    const letterPos = [0, 15.25, 30.25, 42.25, 54.25, 64.25, 73.5];
    const shapes = gsap.utils.toArray(".letter");
    const proxy = document.createElement("div");
    const progressWrap = gsap.utils.wrap(0, 1);
    const wrapRotation = gsap.utils.wrap(-90, 90);

    let screenRange = gsap.utils.mapRange(0, 2000, 500, 4500);
    let dragDistancePerRotation = screenRange(window.innerWidth);
    let startProgress: number;

    const handleResize = () => {
      dragDistancePerRotation = screenRange(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    const spin = gsap.fromTo(shapes, {
      rotationY: (i: number) => letterPos[i] + initialRotationOffset
    }, {
      rotationY: `-=${360}`,
      modifiers: {
        rotationY: (value: string) => wrapRotation(parseFloat(value)) + "deg"
      },
      duration: 10,
      ease: "none",
      repeat: -1
    });

    const updateRotation = function(this: any) {
      const p = startProgress + (this.startX - this.x) / dragDistancePerRotation;
      spin.progress(progressWrap(p));
    };

    const draggable = Draggable.create(proxy, {
      trigger: smooothRef.current,
      type: "x",
      inertia: true,
      allowNativeTouchScrolling: true,
      onPress() {
        gsap.killTweensOf(spin);
        spin.timeScale(0);
        startProgress = spin.progress();
      },
      onDrag: updateRotation,
      onThrowUpdate: updateRotation,
      onRelease() {
        if (!this.tween || !this.tween.isActive()) {
          gsap.to(spin, { timeScale: 1, duration: 1 });
        }
      },
      onThrowComplete() {
        gsap.to(spin, { timeScale: 1, duration: 1 });
      }
    });

    const adjustRadius = () => {
      const radius = Math.min(window.innerWidth * 0.5, 650, window.innerHeight * 0.43);
      
      gsap.set(shapes, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        transformOrigin: `50% 50% ${-radius}px`
      });
    };

    adjustRadius();
    randomizeVisuals();

    window.addEventListener("resize", adjustRadius);

    // Pause/Resume functionality
    if (isPaused) {
      spin.pause();
    } else {
      spin.resume();
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", adjustRadius);
      if (draggable[0]) {
        draggable[0].kill();
      }
    };
  }, [isPaused]);

  return (
    <div id="poster" ref={posterRef} className={`noise ${className}`} style={{'position':'absolute'}}>
      <a 
        ref={logoRef}
        className="logo" 
        href="https://gsap.com" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 623 231">
          <linearGradient id="gradient" gradientTransform="rotate(-25)">
            <stop offset="0%" stopColor="rgb(255, 252, 225)" />
            <stop offset="70%" stopColor="rgb(255, 252, 225)" />
          </linearGradient>
          <path fill="url(#gradient)" d="m182 108-8 36c-1 2-3 3-5 3h-10l-2 2c-9 31-21 52-37 65a82 82 0 0 1-54 16c-21 0-35-6-47-19-15-18-21-46-18-81C8 66 42 1 105 1c20 0 35 6 46 18s16 32 16 57c0 2-1 4-4 4h-46c-2 0-4-2-4-3 0-18-5-26-15-26-18 0-29 24-34 38-8 19-12 40-11 60 0 10 2 23 11 29 8 5 19 2 26-4 7-5 12-15 15-23v-3l-2-1H91l-4-1v-3l8-36c0-2 2-3 4-3h79c2 0 4 2 4 4Z M317 67c0 2-2 4-4 4h-43c-3 0-5-3-5-5 0-13-4-19-13-19s-15 5-15 15c0 11 6 20 23 37 22 21 31 40 31 65-1 41-28 67-69 67-22 0-38-6-48-17-11-11-16-28-15-50 0-2 2-4 4-4h44l4 2v3c0 7 1 13 4 16 2 3 5 4 8 4 9 0 13-6 14-16 0-9-3-17-18-33-20-19-37-39-36-70 0-18 7-35 20-47s31-19 52-19c22 0 38 6 48 18 10 11 15 28 14 49Zm134 156V8a4 4 0 0 0-4-4h-67c-2 0-3 2-4 3l-96 215c-1 3 1 6 4 6h46c3 0 4-1 5-3l10-22c1-3 1-3 4-3h45c3 0 3 0 3 3l-1 21a4 4 0 0 0 4 4h47l3-2a4 4 0 0 0 1-3Zm-83-71h-1a1 1 0 0 1-1-2l1-1 33-83 1-3h1l-3 85c-1 4-1 4-4 4h-27ZM545 4h-35c-2 0-4 1-4 3l-50 216a3 3 0 0 0 1 3l3 2h45c2 0 4-2 4-4l5-24c1-2 0-3-2-4l-2-2-8-4-7-4-3-1a1 1 0 0 1-1-1 2 2 0 0 1 2-2h24c7 0 14 0 21-2 51-9 84-50 85-105 1-47-25-71-77-71h-1Zm-12 129h-1l-2-1 14-62-1-3-22-12a1 1 0 0 1 0-1 2 2 0 0 1 1-2h32c10 0 16 10 16 25-1 27-13 55-37 56Zm48 95c8 0 13-6 13-13 0-8-5-14-13-14-7 0-13 6-13 14 0 7 6 13 13 13Zm-10-14c0-6 4-10 10-10s10 4 10 10c0 7-3 11-10 11s-10-4-10-11Zm5 7h4v-5h1c3 0 2 5 3 5h4c-1 0 0-6-3-6 1-1 3-2 3-4s-2-4-6-4h-6v14Zm4-8v-3h1c2 0 2 0 2 2l-2 1h-1Z" />
        </svg>
      </a>

      <div className="smoooth-container" ref={smooothContainerRef}>
        <div className="smoooth" ref={smooothRef} aria-label="Rotating Smoooth letters">
          <div className="letter" data-letter="S">S</div>
          <div className="letter" data-letter="m">m</div>
          <div className="letter" data-letter="o">o</div>
          <div className="letter" data-letter="o">o</div>
          <div className="letter" data-letter="o">o</div>
          <div className="letter" data-letter="t">t</div>
          <div className="letter" data-letter="h">h</div>
        </div>
      </div>

      <div className="sticker flair" ref={stickerRef} aria-hidden="true"></div>

      <div className="circle" ref={circleRef} aria-hidden="true"></div>

      <div className="controls" ref={controlsRef}>
        <button 
          ref={pauseBtnRef}
          id="pause" 
          type="button" 
          aria-label="Pause or Play Carousel"
          onClick={handlePause}
          className={isPaused ? 'paused' : ''}
        >
          <span className="label"></span>
        </button>

        <button 
          ref={screenshotBtnRef}
          id="screenshot" 
          type="button" 
          aria-label="Download Screenshot"
          onClick={handleScreenshot}
        >
          <span className="label"></span>
        </button>

        <button 
          ref={rerollBtnRef}
          id="reroll" 
          type="button" 
          aria-label="Randomize Visuals"
          onClick={randomizeVisuals}
        >
          <span className="label">&#x21bb;</span>
        </button>
      </div>
    </div>
  );
}