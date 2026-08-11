(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const header = document.querySelector("[data-site-header]");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-nav");
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const setMenu = (open) => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("is-open", open);
  };

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || menuButton.getAttribute("aria-expanded") !== "true") return;
      setMenu(false);
      menuButton.focus();
    });

    document.addEventListener("click", (event) => {
      if (!mobileQuery.matches || navigation.contains(event.target) || menuButton.contains(event.target)) return;
      setMenu(false);
    });

    mobileQuery.addEventListener?.("change", (event) => {
      if (!event.matches) setMenu(false);
    });
  }

  const updateHeader = () => {
    header?.classList.toggle("is-stuck", window.scrollY > 28);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = [...document.querySelectorAll(".reveal")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7%", threshold: 0.06 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const sections = sectionLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      sectionLinks.forEach((link) => {
        const current = link.getAttribute("href") === `#${visible.target.id}`;
        if (current) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-28% 0px -58%", threshold: [0, 0.1, 0.35] });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const productCards = [...document.querySelectorAll("[data-product]")];
  const worldNodes = [...document.querySelectorAll("[data-world]")];

  const setWorld = (name, active) => {
    productCards
      .filter((card) => card.dataset.product === name)
      .forEach((card) => card.classList.toggle("is-active", active));
    worldNodes
      .filter((node) => node.dataset.world === name)
      .forEach((node) => node.classList.toggle("is-active", active));
  };

  [...productCards, ...worldNodes].forEach((item) => {
    const name = item.dataset.product || item.dataset.world;
    item.addEventListener("mouseenter", () => setWorld(name, true));
    item.addEventListener("mouseleave", () => setWorld(name, false));
    item.addEventListener("focusin", () => setWorld(name, true));
    item.addEventListener("focusout", () => setWorld(name, false));
  });

  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = year;
  });
})();
