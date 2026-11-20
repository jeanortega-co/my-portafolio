"use strict";

document.documentElement.classList.add("js");

const introScreen = document.querySelector("#intro-screen");
const introSkipButton = document.querySelector(".intro-skip");

if (introScreen) {
  document.documentElement.classList.add("intro-active");
  document.body.classList.add("intro-active");
  let introTimer = window.setTimeout(startIntroExit, 4400);

  function startIntroExit() {
    window.clearTimeout(introTimer);
    if (introScreen.classList.contains("is-exiting")) return;

    introScreen.classList.add("is-exiting");
    document.body.classList.add("intro-revealing");
    window.setTimeout(() => {
      introScreen.hidden = true;
      document.documentElement.classList.remove("intro-active");
      document.body.classList.remove("intro-active");
    }, 600);
    window.setTimeout(() => {
      document.body.classList.remove("intro-revealing");
    }, 1600);
  }

  if (introSkipButton) {
    introSkipButton.addEventListener("click", startIntroExit, { once: true });
  }
}

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const siteHeader = document.querySelector(".site-header");
let pendingNavTarget = null;
let navArrivalTimer;
let navArrivalDeadline = 0;
let navHighlightTimer;
let highlightedNavTarget = null;
let navScrollFrame = 0;
let savedScrollBehavior = null;

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    navLinks.classList.toggle("is-open", !isOpen);
  });

  navLinks.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a");
    if (!link) return;

    if (link.hash) {
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        event.preventDefault();
        navigateToSection(target, link.hash);
      }
    }

    if (menuToggle.getAttribute("aria-expanded") === "true") {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
      navLinks.classList.remove("is-open");
    }
  });
}

const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
const navSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter((section) => section instanceof HTMLElement);

function setActiveSection(sectionId) {
  sectionLinks.forEach((link) => {
    if (link.hash === "#" + sectionId) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function queueNavArrival(target) {
  pendingNavTarget = target;
  navArrivalDeadline = Date.now() + 5000;
  window.clearTimeout(navArrivalTimer);
  navArrivalTimer = window.setTimeout(completeNavArrival, 140);
}

function navigateToSection(target, hash, updateHistory = true) {
  stopNavScroll();
  if (updateHistory && window.location.hash !== hash) {
    window.history.pushState({ sectionId: target.id }, "", hash);
  }

  setActiveSection(target.id);
  queueNavArrival(target);
  const headerOffset = siteHeader ? siteHeader.getBoundingClientRect().height + 12 : 88;
  const targetPosition = window.scrollY + target.getBoundingClientRect().top - headerOffset;

  const destination = Math.max(targetPosition, 0);
  if (Math.abs(destination - window.scrollY) < 1) {
    window.scrollTo({ top: destination, behavior: "auto" });
    return;
  }

  const root = document.documentElement;
  savedScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  const startPosition = window.scrollY;
  const distance = destination - startPosition;
  const duration = Math.min(900, Math.max(500, Math.abs(distance) * 0.45));
  let startTime = null;

  const animateScroll = (time) => {
    if (startTime === null) startTime = time;
    const progress = Math.min((time - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    window.scrollTo({ top: startPosition + distance * easedProgress, behavior: "auto" });

    if (progress < 1) {
      navScrollFrame = window.requestAnimationFrame(animateScroll);
    } else {
      navScrollFrame = 0;
      restoreScrollBehavior();
    }
  };

  navScrollFrame = window.requestAnimationFrame(animateScroll);
}

function restoreScrollBehavior() {
  if (savedScrollBehavior === null) return;
  if (savedScrollBehavior) {
    document.documentElement.style.scrollBehavior = savedScrollBehavior;
  } else {
    document.documentElement.style.removeProperty("scroll-behavior");
  }
  savedScrollBehavior = null;
}

function stopNavScroll() {
  if (navScrollFrame) window.cancelAnimationFrame(navScrollFrame);
  navScrollFrame = 0;
  restoreScrollBehavior();
}

function cancelNavScrollFromInput() {
  if (!navScrollFrame && !pendingNavTarget) return;
  stopNavScroll();
  pendingNavTarget = null;
  window.clearTimeout(navArrivalTimer);
}

window.addEventListener("popstate", () => {
  const target = document.getElementById(window.location.hash.slice(1)) || document.getElementById("inicio");
  if (target) navigateToSection(target, window.location.hash || "#inicio", false);
});
window.addEventListener("wheel", cancelNavScrollFromInput, { passive: true });
window.addEventListener("touchstart", cancelNavScrollFromInput, { passive: true });
window.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
    cancelNavScrollFromInput();
  }
});

function completeNavArrival() {
  if (!pendingNavTarget) return;

  const headerOffset = siteHeader ? siteHeader.offsetHeight + 8 : 8;
  const targetTop = pendingNavTarget.getBoundingClientRect().top;
  const distanceFromTarget = Math.abs(targetTop - headerOffset);
  const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

  if (distanceFromTarget > 48 && !(atPageEnd && targetTop < window.innerHeight)) {
    if (Date.now() < navArrivalDeadline) {
      navArrivalTimer = window.setTimeout(completeNavArrival, 160);
    } else {
      pendingNavTarget = null;
    }
    return;
  }

  const target = pendingNavTarget;
  const heading = target.querySelector("h1, h2");
  pendingNavTarget = null;
  if (!heading) return;

  if (highlightedNavTarget) {
    highlightedNavTarget.classList.remove("section-highlight");
    const previousHeading = highlightedNavTarget.querySelector("h1, h2");
    if (previousHeading) previousHeading.classList.remove("section-arrival");
  }

  highlightedNavTarget = target;
  target.classList.remove("section-highlight");
  heading.classList.remove("section-arrival");
  window.requestAnimationFrame(() => {
    target.classList.add("section-highlight");
    heading.classList.add("section-arrival");
  });
  window.clearTimeout(navHighlightTimer);
  navHighlightTimer = window.setTimeout(() => {
    target.classList.remove("section-highlight");
    heading.classList.remove("section-arrival");
    if (highlightedNavTarget === target) highlightedNavTarget = null;
  }, 1100);
}

if (navSections.length > 0) setActiveSection("inicio");

let scrollUpdatePending = false;

function updateScrollProgress() {
  if (siteHeader) {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    siteHeader.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, progress))));
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  if (navSections.length > 0) {
    const currentSection = navSections
      .filter((section) => section.getBoundingClientRect().top <= window.innerHeight * 0.35)
      .pop() || navSections[0];
    setActiveSection(currentSection.id);
  }

  scrollUpdatePending = false;
}

function scheduleScrollProgress() {
  if (!scrollUpdatePending) {
    scrollUpdatePending = true;
    window.requestAnimationFrame(updateScrollProgress);
  }
  if (pendingNavTarget) {
    window.clearTimeout(navArrivalTimer);
    navArrivalTimer = window.setTimeout(completeNavArrival, 140);
  }
}

window.addEventListener("scroll", scheduleScrollProgress, { passive: true });
window.addEventListener("resize", scheduleScrollProgress);
updateScrollProgress();

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.dataset.revealDirection = entry.boundingClientRect.top < 0 ? "up" : "down";
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } else {
        entry.target.classList.remove("is-visible");
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  const updateFallbackReveals = () => {
    revealElements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      const isVisible = bounds.top < window.innerHeight * 0.94 && bounds.bottom > window.innerHeight * 0.06;
      element.dataset.revealDirection = bounds.top < 0 ? "up" : "down";
      element.classList.toggle("is-visible", isVisible);
    });
  };

  let fallbackRevealUpdatePending = false;
  const scheduleFallbackReveals = () => {
    if (fallbackRevealUpdatePending) return;
    fallbackRevealUpdatePending = true;
    window.requestAnimationFrame(() => {
      fallbackRevealUpdatePending = false;
      updateFallbackReveals();
    });
  };

  window.addEventListener("scroll", scheduleFallbackReveals, { passive: true });
  window.addEventListener("resize", scheduleFallbackReveals);
  updateFallbackReveals();
}

const copyButton = document.querySelector(".copy-email");
const copyFeedback = document.querySelector(".copy-feedback");
const copyLabel = document.querySelector(".copy-label");
let copyFeedbackTimer;

if (copyButton && copyFeedback && copyLabel) {
  copyButton.addEventListener("click", async () => {
    const email = copyButton.dataset.email;
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      copyButton.classList.add("is-copied");
      copyFeedback.textContent = "Correo copiado: " + email;
      copyLabel.textContent = "Correo copiado";

      window.clearTimeout(copyFeedbackTimer);
      copyFeedbackTimer = window.setTimeout(() => {
        copyButton.classList.remove("is-copied");
        copyFeedback.textContent = "";
        copyLabel.textContent = "Copiar correo";
      }, 2600);
    } catch (error) {
      copyButton.classList.remove("is-copied");
      copyFeedback.textContent = "No se pudo copiar. Escríbeme a " + email;
      copyLabel.textContent = "Intenta de nuevo";
      console.error("No se pudo copiar el correo al portapapeles.", error);
    }
  });
}

const yearElement = document.querySelector("#current-year");
if (yearElement) yearElement.textContent = String(new Date().getFullYear());
