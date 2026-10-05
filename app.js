// ===== Shared JavaScript for all pages (Units 3 & 4) =====

// ── Navbar Auth: Show Login button OR user greeting ────────────────────────
(function renderNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  const raw = localStorage.getItem('myblog_session') || sessionStorage.getItem('myblog_session');
  if (raw) {
    try {
      const session = JSON.parse(raw);
      const initials = session.name ? session.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
      const firstName = session.name ? session.name.split(' ')[0] : 'User';
      navAuth.innerHTML = `
        <div class="nav-user-greeting">
          <div class="nav-user-avatar">${initials}</div>
          <span>Hi, ${firstName}</span>
        </div>
        <button class="btn-logout" id="nav-logout-btn" title="Logout">Logout</button>
      `;
      document.getElementById('nav-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('myblog_session');
        sessionStorage.removeItem('myblog_session');
        window.location.reload();
      });
    } catch (_) {
      renderLoginBtn(navAuth);
    }
  } else {
    renderLoginBtn(navAuth);
  }

  function renderLoginBtn(container) {
    container.innerHTML = `<a href="login.html" class="btn-login">🔐 Login</a>`;
  }
})();


// ── Toast Helper ─────────────────────────────────────────────────────────────
function showSiteToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = message;
  toast.className = `show ${type}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.className = '';
  }, type === 'success' ? 4500 : 3500);
}

// 1. Dark mode toggle — preference saved in localStorage
const themeBtn = document.getElementById("theme-toggle");
const applyTheme = () => {
  const isDark = localStorage.getItem("theme") === "dark";
  document.body.classList.toggle("dark", isDark);
  if (themeBtn) themeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
};
applyTheme();
themeBtn?.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme();
});

// 2. Blog Search & Filter Logic
function initBlogSearch() {
  const searchInput = document.getElementById("blog-search-input");
  const clearBtn = document.getElementById("clear-search-btn");
  const statsEl = document.getElementById("search-stats");
  const filterPills = document.querySelectorAll(".filter-pill");
  const postGrid = document.querySelector(".post-grid");
  
  if (!postGrid) return;
  const cards = Array.from(postGrid.querySelectorAll(".post-card"));
  if (cards.length === 0) return;

  let activeCategory = "all";

  // Create empty state message element if not present
  let emptyState = document.getElementById("empty-search-state");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "empty-search-state";
    emptyState.className = "empty-state";
    emptyState.style.display = "none";
    emptyState.innerHTML = `
      <h3>No Blogs Found</h3>
      <p>Try searching with different keywords or selecting another category.</p>
    `;
    postGrid.appendChild(emptyState);
  }

  function filterPosts() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let visibleCount = 0;

    cards.forEach(card => {
      const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
      const desc = card.querySelector("p")?.textContent.toLowerCase() || "";
      const cat = card.querySelector(".category")?.textContent.toLowerCase() || "";

      const matchesQuery = !query || title.includes(query) || desc.includes(query) || cat.includes(query);
      const matchesCategory = activeCategory === "all" || cat.includes(activeCategory);

      if (matchesQuery && matchesCategory) {
        card.style.display = "";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    // Update clear button visibility
    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? "inline-block" : "none";
    }

    // Update empty state
    if (visibleCount === 0) {
      emptyState.style.display = "block";
    } else {
      emptyState.style.display = "none";
    }

    // Update stats
    if (statsEl) {
      if (query || activeCategory !== "all") {
        statsEl.textContent = `Showing ${visibleCount} of ${cards.length} posts`;
      } else {
        statsEl.textContent = `Showing all ${cards.length} posts`;
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterPosts);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterPosts();
      searchInput.focus();
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.dataset.category ? pill.dataset.category.toLowerCase() : "all";
      filterPosts();
    });
  });

  // Initial calculation
  filterPosts();
}

// 3. Blog Card Edit & Delete Event Handlers
function initCardActions() {
  // Delegate click events on document for edit and delete buttons
  document.addEventListener("click", async (e) => {
    // Delete Button Click
    const deleteBtn = e.target.closest(".btn-delete, .action-delete-post");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();

      const filename = deleteBtn.dataset.file;
      const title = deleteBtn.dataset.title || "this blog post";

      if (!filename) return;

      const confirmed = window.confirm(`Are you sure you want to delete "${title}"?\nThis action cannot be undone.`);
      if (!confirmed) return;

      try {
        const res = await fetch("/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename })
        });

        const data = await res.json();
        if (data.success) {
          showSiteToast(`🗑️ "${title}" deleted successfully!`, "success");

          // If deleted from within a single post page, redirect to blogs.html
          if (deleteBtn.classList.contains("action-delete-post")) {
            setTimeout(() => {
              window.location.href = "blogs.html";
            }, 1200);
            return;
          }

          // If on a grid page, remove the card with smooth fade out
          const card = deleteBtn.closest(".post-card");
          if (card) {
            card.style.transition = "all 0.3s ease";
            card.style.opacity = "0";
            card.style.transform = "scale(0.9)";
            setTimeout(() => {
              card.remove();
              // Re-run filter stats
              const searchInput = document.getElementById("blog-search-input");
              if (searchInput) searchInput.dispatchEvent(new Event("input"));
            }, 300);
          }
        } else {
          showSiteToast(`❌ Could not delete: ${data.error || "Server error"}`, "error");
        }
      } catch (err) {
        showSiteToast("❌ Network error connecting to server. Is node server running?", "error");
      }
      return;
    }

    // Edit Button Click
    const editBtn = e.target.closest(".btn-edit, .action-edit-post");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const filename = editBtn.dataset.file;
      if (filename) {
        window.location.href = `admin.html?edit=${encodeURIComponent(filename)}`;
      }
    }
  });
}

// 4. Newsletter form — email validation
const newsletter = document.getElementById("newsletter-form");
if (newsletter) {
  const msg = document.createElement("p");
  msg.className = "form-msg";
  newsletter.after(msg);
  newsletter.addEventListener("submit", e => {
    e.preventDefault();
    const email = newsletter.querySelector("input").value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    msg.className = `form-msg ${valid ? "success" : "error"}`;
    msg.textContent = valid ? `Thanks! ${email} is subscribed.` : "Please enter a valid email.";
    if (valid) newsletter.reset();
  });
}

// 5. Read time — calculated from word count of the post
const postBody = document.getElementById("post-body");
const readTime = document.getElementById("read-time");
if (postBody && readTime && !readTime.textContent.trim()) {
  const words = postBody.innerText.trim().split(/\s+/).length;
  readTime.textContent = `${Math.max(1, Math.ceil(words / 200))} min read`;
}

// 6. Comments — saved per page in localStorage
const commentsList = document.getElementById("comments-list");
if (commentsList) {
  const key = "comments-" + location.pathname;
  const escape = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const form = document.createElement("form");
  form.className = "comment-form";
  form.innerHTML = `
    <input type="text" name="name" placeholder="Your name" required>
    <textarea name="text" rows="3" placeholder="Write a comment..." required></textarea>
    <button type="submit">Post Comment</button>`;
  commentsList.before(form);

  const render = () => {
    const comments = JSON.parse(localStorage.getItem(key)) || [];
    commentsList.innerHTML = comments.length
      ? comments.map(({ name, text, date }) =>
          `<div class="comment"><strong>${escape(name)}</strong><small>${date}</small><p>${escape(text)}</p></div>`).join("")
      : "<p>No comments yet. Be the first to leave a thought!</p>";
  };
  form.addEventListener("submit", e => {
    e.preventDefault();
    const { name, text } = Object.fromEntries(new FormData(form));
    const comments = JSON.parse(localStorage.getItem(key)) || [];
    localStorage.setItem(key, JSON.stringify([{ name, text, date: new Date().toLocaleDateString() }, ...comments]));
    form.reset();
    render();
  });
  render();
}

// 7. Share buttons
document.querySelectorAll(".share-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    const url = encodeURIComponent(location.href);
    const title = encodeURIComponent(document.title);
    const link = btn.textContent.includes("Twitter")
      ? `https://twitter.com/intent/tweet?url=${url}&text=${title}`
      : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(link, "_blank");
  });
});

// Initialize features when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initBlogSearch();
  initCardActions();
});
