"use strict";

// Ensure code runs after DOM is ready and tolerate pages that don't include all elements
document.addEventListener("DOMContentLoaded", function () {
  // Diagnostic log for debugging page-specific elements
  try {
    const found = {
      agentsList: !!document.getElementById("agentsList"),
      agentSearch: !!document.getElementById("agentSearch"),
      cartSidePanel: !!document.getElementById("cartSidePanel"),
      quickViewModal: !!document.getElementById("quickViewModal"),
    };
    console.debug("[site:init] element presence:", found);
  } catch (e) {
    console.debug("[site:init] diagnostic error", e);
  }

  // Simple tab switcher
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
    });
  });

  // Fake search (only if elements exist)
  const btn = document.getElementById("searchBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const locEl = document.getElementById("location");
      const ptypeEl = document.getElementById("ptype");
      const q = locEl ? locEl.value.trim() : "";
      const type = ptypeEl ? ptypeEl.value : "";
      alert(`Searching for ${type} in "${q || "anywhere"}"...`);
    });
  }

  // Cart logic (side panel, select/unselect toggle)
  const cartBtn = document.getElementById("cartBtn");
  const cartPanel = document.getElementById("cartSidePanel");
  const closeCartPanelBtn = document.getElementById("closeCartPanelBtn");
  const cartCount = document.getElementById("cartCount");
  const cartProperties = document.getElementById("cartProperties");
  const selectBtns = Array.from(document.querySelectorAll(".select-btn"));
  const allPropertyCards = Array.from(document.querySelectorAll(".card"));
  // Load persisted selections from localStorage so the cart survives page navigation
  let selectedProperties = [];
  const STORAGE_KEY = "selectedProperties";

  function saveSelectedProperties() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(selectedProperties || [])
      );
    } catch (err) {
      console.debug("[cart] could not save to localStorage", err);
    }
  }

  function loadSelectedProperties() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      console.debug("[cart] could not read localStorage", err);
    }
    return [];
  }

  // initialize from storage
  selectedProperties = loadSelectedProperties();
  // reflect stored state in the UI immediately
  try {
    updateCart();
  } catch (err) {
    // updateCart may not be defined yet in some page shapes; ignore
  }
  // Track last focused element when opening modals/panels so we can return focus on close
  let lastActiveElement = null;

  function getPropertyData(card) {
    return {
      img: card.querySelector("img")?.src || "",
      price: card.querySelector(".price")?.textContent || "",
      meta: card.querySelector(".meta")?.textContent || "",
      badges: card.querySelector(".badges")?.textContent || "",
      details: Array.from(card.querySelectorAll(".extra-details li")).map(
        (li) => ({
          label: li.getAttribute("data-label"),
          value: li.textContent,
        })
      ),
      cardIdx: allPropertyCards.indexOf(card),
    };
  }

  function updateCart() {
    if (!cartCount || !cartProperties) return;
    cartCount.textContent = selectedProperties.length;
    if (selectedProperties.length === 0) {
      cartProperties.innerHTML = "<p>No properties selected yet.</p>";
      selectBtns.forEach((btn) => {
        btn.textContent = "Select";
        btn.classList.remove("selected");
      });
      return;
    }
    cartProperties.innerHTML = selectedProperties
      .map(
        (prop, idx) => `
        <div class=\"cart-card\">
          <img src=\"${
            prop.img
          }\" style=\"width:100%;border-radius:1rem;margin-bottom:1rem;max-width:200px;\" />
          <h3>${prop.price}</h3>
          <div class=\"meta\">${prop.meta}</div>
          <div class=\"badges\">${prop.badges}</div>
          <ul class=\"modal-details-list\">
            ${prop.details
              .map(
                (d) =>
                  `<li><span class='modal-details-label'>${d.label}:</span> <span class='modal-details-value'>${d.value}</span></li>`
              )
              .join("")}
          </ul>
          <button class=\"remove-cart-btn\" data-idx=\"${idx}\">Remove</button>
        </div>
      `
      )
      .join("");

    // Update select/unselect buttons
    selectBtns.forEach((btn, idx) => {
      const card = allPropertyCards[idx];
      if (!card) return;
      const propData = getPropertyData(card);
      const isSelected = selectedProperties.some(
        (p) => p.img === propData.img && p.price === propData.price
      );
      if (isSelected) {
        btn.textContent = "Unselect";
        btn.classList.add("selected");
      } else {
        btn.textContent = "Select";
        btn.classList.remove("selected");
      }
    });

    // Remove button logic
    cartProperties.querySelectorAll(".remove-cart-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const idx = parseInt(btn.getAttribute("data-idx"));
        selectedProperties.splice(idx, 1);
        saveSelectedProperties();
        updateCart();
      });
    });
  }

  // Attach select/unselect handlers (if any select buttons exist)
  if (selectBtns.length > 0 && allPropertyCards.length > 0) {
    selectBtns.forEach((btn, idx) => {
      btn.addEventListener("click", function (e) {
        const card = allPropertyCards[idx];
        if (!card) return;
        const propData = getPropertyData(card);
        const isSelected = selectedProperties.some(
          (p) => p.img === propData.img && p.price === propData.price
        );
        if (!isSelected) {
          selectedProperties.push(propData);
          saveSelectedProperties();
        } else {
          selectedProperties = selectedProperties.filter(
            (p) => !(p.img === propData.img && p.price === propData.price)
          );
          saveSelectedProperties();
        }
        updateCart();
      });
    });
  }

  if (cartBtn && cartPanel) {
    cartBtn.addEventListener("click", function (e) {
      e.preventDefault();
      // remember opener and focus the panel close button
      lastActiveElement = document.activeElement;
      cartPanel.classList.add("active");
      updateCart();
      closeCartPanelBtn?.focus();
    });
  }
  if (closeCartPanelBtn && cartPanel) {
    closeCartPanelBtn.addEventListener("click", function () {
      cartPanel.classList.remove("active");
      // restore focus
      try {
        lastActiveElement?.focus?.();
      } catch (err) {}
    });
  }
  window.addEventListener("click", function (e) {
    if (cartPanel && e.target === cartPanel)
      cartPanel.classList.remove("active");
  });

  // Filter logic (only if filter form exists)
  const filterForm = document.getElementById("propertyFilterForm");
  const cardsContainer = document.querySelector(".cards");
  const allCards = cardsContainer
    ? Array.from(cardsContainer.querySelectorAll(".card"))
    : [];

  function matchesFilter(card, filters) {
    // Get details
    const price = parseInt(
      card.querySelector(".price")?.textContent.replace(/[^\d]/g, "") || "0"
    );
    const meta = card.querySelector(".meta")?.textContent || "";
    const details = {};
    card.querySelectorAll(".extra-details li").forEach((li) => {
      details[li.getAttribute("data-label")] = li.textContent.toLowerCase();
    });
    // Location
    if (
      filters.location &&
      !details["Location"]?.includes(filters.location.toLowerCase())
    )
      return false;
    // Type
    if (filters.type && details["Type"] !== filters.type.toLowerCase())
      return false;
    // Bedrooms
    if (filters.bedrooms) {
      const beds = parseInt(meta.match(/(\d+) Beds/)?.[1] || "0");
      if (beds < parseInt(filters.bedrooms)) return false;
    }
    // Amenities
    if (
      filters.amenities &&
      !details["Amenities"]?.includes(filters.amenities.toLowerCase())
    )
      return false;
    // Min Price
    if (filters.minPrice && price < parseInt(filters.minPrice)) return false;
    // Max Price
    if (filters.maxPrice && price > parseInt(filters.maxPrice)) return false;
    return true;
  }

  function filterProperties(e) {
    if (e) e.preventDefault();
    if (!filterForm) return;
    const formData = new FormData(filterForm);
    const filters = {};
    for (const [key, value] of formData.entries()) {
      if (value) filters[key] = value;
    }
    allCards.forEach((card) => {
      card.style.display = matchesFilter(card, filters) ? "" : "none";
    });
  }
  if (filterForm) {
    filterForm.addEventListener("submit", filterProperties);
    filterForm.addEventListener("input", filterProperties);
    // run initial filter to normalise view
    filterProperties();
  }

  // Favorite button toggle
  document.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      btn.classList.toggle("active");
    });
  });

  // Quick View modal logic
  const modal = document.getElementById("quickViewModal");
  const modalDetails = document.getElementById("modalDetails");
  const closeModalBtn = document.getElementById("closeModalBtn");
  document.querySelectorAll(".quick-view-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const card = btn.closest(".card");
      if (!card || !modal || !modalDetails) return;
      const imgSrc = card.querySelector("img")?.src || "";
      const price = card.querySelector(".price")?.textContent || "";
      const meta = card.querySelector(".meta")?.innerHTML || "";
      const badges = card.querySelector(".badges")?.innerHTML || "";
      const detailsList = card.querySelector(".extra-details");
      let detailsHtml = "";
      if (detailsList) {
        detailsHtml = '<ul class="modal-details-list">';
        detailsList.querySelectorAll("li").forEach((li) => {
          detailsHtml += `<li><span class='modal-details-label'>${li.getAttribute(
            "data-label"
          )}: </span> <span class='modal-details-value'>${
            li.textContent
          }</span></li>`;
        });
        detailsHtml += "</ul>";
      }
      modalDetails.innerHTML = `
              <img src="${imgSrc}" style="width:100%;border-radius:1rem;margin-bottom:1rem;" />
              <h3 style="margin:0 0 1rem 0;">${price}</h3>
              <div class="meta" style="margin-bottom:1rem;">${meta}</div>
              <div class="badges">${badges}</div>
              ${detailsHtml}
            `;
      // remember opener, open modal and focus close button
      lastActiveElement = btn;
      modal.classList.add("active");
      closeModalBtn?.focus();
    });
  });
  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener("click", function () {
      modal.classList.remove("active");
    });
  }
  window.addEventListener("click", function (e) {
    if (modal && e.target === modal) modal.classList.remove("active");
  });

  // --- Agents page interactions ---
  const agentsList = document.getElementById("agentsList");
  const agentSearch = document.getElementById("agentSearch");
  const agentLang = document.getElementById("agentLang");
  const agentSpecialty = document.getElementById("agentSpecialty");
  const agentFilterBtn = document.getElementById("agentFilterBtn");

  function filterAgents() {
    if (!agentsList) return;
    const q = agentSearch ? agentSearch.value.trim().toLowerCase() : "";
    const lang = agentLang ? agentLang.value : "";
    const spec = agentSpecialty ? agentSpecialty.value : "";
    Array.from(agentsList.querySelectorAll(".card")).forEach((card) => {
      const name = card.getAttribute("data-name")?.toLowerCase() || "";
      const specialty = card.getAttribute("data-specialty") || "";
      const languages = card.getAttribute("data-languages") || "";
      let visible = true;
      if (q && !(name.includes(q) || specialty.toLowerCase().includes(q)))
        visible = false;
      if (
        lang &&
        !languages
          .split(",")
          .map((s) => s.trim())
          .includes(lang)
      )
        visible = false;
      if (spec && specialty !== spec) visible = false;
      card.style.display = visible ? "" : "none";
    });
  }

  if (agentFilterBtn) agentFilterBtn.addEventListener("click", filterAgents);
  if (agentSearch) agentSearch.addEventListener("input", filterAgents);

  // Contact modal for agents
  const agentModal = document.getElementById("agentContactModal");
  const closeAgentModal = document.getElementById("closeAgentModal");
  const agentModalName = document.getElementById("agentModalName");
  const agentModalInfo = document.getElementById("agentModalInfo");
  const agentContactForm = document.getElementById("agentContactForm");
  const agentContactCancel = document.getElementById("agentContactCancel");

  document.querySelectorAll(".contact-btn[data-agent]").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const agentName = btn.getAttribute("data-agent");
      const card = Array.from(document.querySelectorAll(".card")).find(
        (c) => c.getAttribute("data-name") === agentName
      );
      if (!card || !agentModal) return;
      const phone = card.getAttribute("data-phone") || "";
      const email = card.getAttribute("data-email") || "";
      agentModalName.textContent = `Contact ${agentName}`;
      agentModalInfo.textContent = `Phone: ${phone} • Email: ${email}`;
      // remember opener and focus the name input inside the modal
      lastActiveElement = btn;
      agentModal.classList.add("active");
      document.getElementById("visitorName")?.focus();
    });
  });
  // Close agent modal and restore focus
  function closeAgentModalFn() {
    if (!agentModal) return;
    agentModal.classList.remove("active");
    try {
      lastActiveElement?.focus?.();
    } catch (err) {}
  }
  if (closeAgentModal && agentModal)
    closeAgentModal.addEventListener("click", closeAgentModalFn);
  if (agentContactCancel && agentModal)
    agentContactCancel.addEventListener("click", closeAgentModalFn);
  if (agentContactForm) {
    agentContactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      // fake send
      const name = document.getElementById("visitorName")?.value || "";
      const email = document.getElementById("visitorEmail")?.value || "";
      alert(
        `Message sent to ${agentModalName.textContent}. We'll connect with you at ${email}.`
      );
      agentContactForm.reset();
      if (agentModal) closeAgentModalFn();
    });
  }

  // Global keyboard handler: Esc to close modals/panels and basic focus trap for agent modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (agentModal && agentModal.classList.contains("active")) {
        closeAgentModalFn();
        return;
      }
      if (modal && modal.classList.contains("active")) {
        modal.classList.remove("active");
        try {
          lastActiveElement?.focus?.();
        } catch (err) {}
        return;
      }
      if (cartPanel && cartPanel.classList.contains("active")) {
        cartPanel.classList.remove("active");
        try {
          lastActiveElement?.focus?.();
        } catch (err) {}
        return;
      }
    }
    // Simple focus trap for agent modal
    if (
      e.key === "Tab" &&
      agentModal &&
      agentModal.classList.contains("active")
    ) {
      const focusable = agentModal.querySelectorAll(
        "a[href], button:not([disabled]), textarea, input, select"
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
});
