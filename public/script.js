import { auth, db, isUsingEmulators } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const CATEGORY_SEEDS = [
  { id: "banking", name: "Banking" },
  { id: "home-renovation", name: "Home Renovation" },
  { id: "vehicle-repairs", name: "Vehicle Repairs" },
  { id: "medical-help", name: "Medical Help" },
  { id: "groceries", name: "Groceries" },
  { id: "child-care", name: "Child Care" },
  { id: "pet-care", name: "Pet Care" },
  { id: "education", name: "Education" },
  { id: "technology-support", name: "Technology Support" },
  { id: "moving-help", name: "Moving Help" },
];

function showMessage(element, text, tone = "default") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.dataset.tone = tone;
}

function clearMessage(element) {
  if (!element) {
    return;
  }

  element.textContent = "";
  delete element.dataset.tone;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value || !value.toDate) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value.toDate());
}

function formatStatus(status) {
  return status === "resolved" ? "Resolved" : "Open";
}

function getFriendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/missing-password": "Please enter your password.",
    "auth/weak-password": "Password should be at least 6 characters long.",
    "auth/network-request-failed": "Network error. Make sure your local server and Firebase emulators are running.",
    "permission-denied": "Permission denied. Check that Firestore rules and emulators are running.",
    unavailable: "Service unavailable. Check that Firestore and Auth emulators are running.",
  };

  return messages[error.code] || messages[error.message] || "Something went wrong. Please try again.";
}

async function signUpUser(email, password, profileData) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userProfile = {
    uid: userCredential.user.uid,
    displayName: profileData.displayName,
    email,
    area: profileData.area,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", userCredential.user.uid), userProfile);
  return userCredential.user;
}

async function signInUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

async function signOutUser() {
  await signOut(auth);
}

function updateAuthAwareUi(user) {
  const loginLink = document.getElementById("nav-login-link");
  const feedLink = document.getElementById("nav-feed-link");
  const profileLink = document.getElementById("nav-profile-link");
  const logoutButton = document.getElementById("logout-btn");
  const homeMainCta = document.getElementById("home-main-cta");

  if (loginLink) {
    loginLink.classList.toggle("hidden", Boolean(user));
  }

  if (feedLink) {
    feedLink.classList.toggle("hidden", !user);
  }

  if (profileLink) {
    profileLink.classList.toggle("hidden", !user);
  }

  if (logoutButton) {
    logoutButton.classList.toggle("hidden", !user);
  }

  if (homeMainCta) {
    homeMainCta.textContent = user ? "Go to Feed" : "Go to Login";
    homeMainCta.setAttribute("href", user ? "feed.html" : "login.html");
  }
}

function requireAuthRedirect(onAuthenticated) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    await onAuthenticated(user);
  });
}

async function ensureUserProfile(user, profileOverride = null) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    return { uid: user.uid, ...userSnapshot.data() };
  }

  const fallbackName =
    profileOverride?.displayName ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Neighbor Aid User";

  const fallbackArea = profileOverride?.area || "Area not set";
  const profile = {
    uid: user.uid,
    displayName: fallbackName,
    email: user.email || "",
    area: fallbackArea,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);
  return {
    uid: user.uid,
    displayName: fallbackName,
    email: user.email || "",
    area: fallbackArea,
  };
}

async function updateUserProfile(uid, profileData) {
  await updateDoc(doc(db, "users", uid), {
    displayName: profileData.displayName,
    area: profileData.area,
    updatedAt: serverTimestamp(),
  });
}

async function ensureCategoriesSeeded() {
  const categoryQuery = query(collection(db, "categories"), limit(1));
  const categorySnapshot = await getDocs(categoryQuery);

  if (!categorySnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  CATEGORY_SEEDS.forEach((category, index) => {
    batch.set(doc(db, "categories", category.id), {
      name: category.name,
      slug: category.id,
      sortOrder: index + 1,
      isActive: true,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

async function loadCategories(selectElement) {
  await ensureCategoriesSeeded();

  const categoriesQuery = query(collection(db, "categories"), orderBy("sortOrder"));
  const categorySnapshot = await getDocs(categoriesQuery);

  const categories = categorySnapshot.docs
    .map((categoryDoc) => ({
      id: categoryDoc.id,
      ...categoryDoc.data(),
    }))
    .filter((category) => category.isActive);

  selectElement.innerHTML = '<option value="">Select a category</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    option.dataset.categoryName = category.name;
    selectElement.appendChild(option);
  });
}

function renderEmptyFeed(feedList) {
  feedList.innerHTML = `
    <article class="request-card">
      <div class="section-heading">
        <p class="section-label">No Posts Yet</p>
        <h2>Be the first to ask for help</h2>
        <p>Your new request will appear here once you create it.</p>
      </div>
    </article>
  `;
}

function createPostCard(post, currentUserId) {
  const card = document.createElement("article");
  card.className = "request-card";

  const canChangeStatus = currentUserId === post.authorId;
  const statusClass = post.status === "resolved" ? "status-resolved" : "status-open";

  card.innerHTML = `
    <div class="card-top">
      <a class="request-link" href="post.html?id=${post.id}">
        <h3>${escapeHtml(post.authorName)}</h3>
        <p class="meta-text">${escapeHtml(post.authorArea || "Local community")} • ${formatDate(post.createdAt)}</p>
      </a>
      <span class="status-badge ${statusClass}">${formatStatus(post.status)}</span>
    </div>

    <div class="card-body">
      <span class="category-badge">${escapeHtml(post.categoryName)}</span>
      <p class="meta-text">Help required at: ${escapeHtml(post.helpLocation || "Location not set")}</p>
      <p>${escapeHtml(post.text)}</p>
      <p class="comments-preview">${post.commentCount || 0} comment${post.commentCount === 1 ? "" : "s"}</p>
    </div>

    <div class="card-actions">
      ${
        canChangeStatus
          ? `<button class="status-btn" data-action="toggle-status" data-id="${post.id}" type="button">
              Mark as ${post.status === "open" ? "Resolved" : "Open"}
            </button>`
          : `<span class="meta-text">Only the post author can change status.</span>`
      }
      <a class="secondary-btn" href="post.html?id=${post.id}">View Post</a>
    </div>
  `;

  return card;
}

function renderPosts(feedList, posts, currentUserId) {
  if (!posts.length) {
    renderEmptyFeed(feedList);
    return;
  }

  feedList.innerHTML = "";

  posts.forEach((post) => {
    feedList.appendChild(createPostCard(post, currentUserId));
  });
}

function renderPostDetail(detailContainer, post, currentUserId) {
  const canChangeStatus = currentUserId === post.authorId;
  const statusClass = post.status === "resolved" ? "status-resolved" : "status-open";

  detailContainer.innerHTML = `
    <div class="section-heading">
      <p class="section-label">Post Details</p>
      <h1>${escapeHtml(post.authorName)}'s request</h1>
      <div class="meta-row">
        <p class="meta-text">${escapeHtml(post.authorArea || "Local community")} • ${formatDate(post.createdAt)}</p>
        <span class="category-badge">${escapeHtml(post.categoryName)}</span>
        <span class="status-badge ${statusClass}">${formatStatus(post.status)}</span>
      </div>
    </div>

    <div class="card-body">
      <p class="meta-text">Help required at: ${escapeHtml(post.helpLocation || "Location not set")}</p>
      <p>${escapeHtml(post.text)}</p>
    </div>

    <div class="card-actions">
      ${
        canChangeStatus
          ? `<button class="status-btn" data-action="toggle-detail-status" data-id="${post.id}" type="button">
              Mark as ${post.status === "open" ? "Resolved" : "Open"}
            </button>`
          : `<span class="meta-text">Only the post author can change status.</span>`
      }
    </div>
  `;
}

function renderComments(commentsContainer, comments) {
  if (!comments.length) {
    commentsContainer.innerHTML =
      '<p class="meta-text">No comments yet. Be the first to support this request.</p>';
    return;
  }

  commentsContainer.innerHTML = comments
    .map(
      (comment) => `
        <div class="comment-item">
          <strong>${escapeHtml(comment.authorName)}</strong>
          <p>${escapeHtml(comment.text)}</p>
          <p class="meta-text">${formatDate(comment.createdAt)}</p>
        </div>
      `
    )
    .join("");
}

async function createPost(profile, categorySelect, requestLocation, requestText) {
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];

  await addDoc(collection(db, "posts"), {
    authorId: profile.uid,
    authorName: profile.displayName,
    authorArea: profile.area,
    categoryId: categorySelect.value,
    categoryName: selectedOption.dataset.categoryName || selectedOption.textContent,
    helpLocation: requestLocation,
    text: requestText,
    status: "open",
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
  });
}

async function togglePostStatus(post) {
  const nextStatus = post.status === "open" ? "resolved" : "open";

  await updateDoc(doc(db, "posts", post.id), {
    status: nextStatus,
    resolvedAt: nextStatus === "resolved" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

async function addCommentToPost(postId, profile, text) {
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (transaction) => {
    const postSnapshot = await transaction.get(postRef);

    if (!postSnapshot.exists()) {
      throw new Error("Post not found.");
    }

    const nextCommentCount = (postSnapshot.data().commentCount || 0) + 1;
    const commentRef = doc(collection(postRef, "comments"));

    transaction.set(commentRef, {
      authorId: profile.uid,
      authorName: profile.displayName,
      text,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(postRef, {
      commentCount: nextCommentCount,
      updatedAt: serverTimestamp(),
    });
  });
}

function initializeLoginPage() {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginButton = document.getElementById("show-login");
  const signupButton = document.getElementById("show-signup");
  const loginMessage = document.getElementById("login-message");
  const authModeNote = document.getElementById("auth-mode-note");

  if (!loginForm || !signupForm || !loginButton || !signupButton) {
    return;
  }

  let hasCheckedInitialAuth = false;

  onAuthStateChanged(auth, (user) => {
    if (!hasCheckedInitialAuth) {
      hasCheckedInitialAuth = true;
    } else {
      return;
    }

    if (user && window.location.pathname.endsWith("login.html")) {
      window.location.href = "feed.html";
    }
  });

  function showLoginForm() {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    loginButton.classList.add("active");
    signupButton.classList.remove("active");
    authModeNote.textContent = "Login with an existing Neighbor Aid account.";
    clearMessage(loginMessage);
  }

  function showSignupForm() {
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    signupButton.classList.add("active");
    loginButton.classList.remove("active");
    authModeNote.textContent = "Create a new account to join your local support network.";
    clearMessage(loginMessage);
  }

  loginButton.addEventListener("click", showLoginForm);
  signupButton.addEventListener("click", showSignupForm);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(loginMessage);

    const email = loginForm.loginEmail.value.trim();
    const password = loginForm.loginPassword.value.trim();

    if (!email || !password) {
      showMessage(loginMessage, "Please enter both email and password.", "error");
      return;
    }

    try {
      await signInUser(email, password);
      showMessage(loginMessage, "Login successful. Redirecting to the feed...", "success");
      window.location.href = "feed.html";
    } catch (error) {
      showMessage(loginMessage, getFriendlyError(error), "error");
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(loginMessage);

    const displayName = signupForm.signupName.value.trim();
    const email = signupForm.signupEmail.value.trim();
    const password = signupForm.signupPassword.value.trim();
    const area = signupForm.signupArea.value.trim();

    if (!displayName || !email || !password || !area) {
      showMessage(loginMessage, "Please fill in all signup fields.", "error");
      return;
    }

    try {
      const user = await signUpUser(email, password, {
        displayName,
        area,
      });
      await ensureUserProfile(user, {
        displayName,
        area,
      });
      showMessage(loginMessage, "Account created successfully. Redirecting to the feed...", "success");
      window.location.href = "feed.html";
    } catch (error) {
      showMessage(loginMessage, getFriendlyError(error), "error");
    }
  });
}

function initializeHomePage() {
  const homeMainCta = document.getElementById("home-main-cta");
  const logoutButton = document.getElementById("logout-btn");

  if (!homeMainCta && !logoutButton) {
    return;
  }

  onAuthStateChanged(auth, (user) => {
    updateAuthAwareUi(user);
  });

  attachLogoutHandler();
}

function initializeFeedPage() {
  const feedList = document.getElementById("feed-list");
  const postForm = document.getElementById("post-form");
  const categoryField = document.getElementById("request-category");
  const locationField = document.getElementById("request-location");
  const feedMessage = document.getElementById("feed-message");
  const currentUserName = document.getElementById("current-user-name");
  const currentUserArea = document.getElementById("current-user-area");

  if (!feedList || !postForm || !categoryField || !locationField) {
    return;
  }

  requireAuthRedirect(async (user) => {
    try {
      const profile = await ensureUserProfile(user);

      currentUserName.textContent = profile.displayName;
      if (currentUserArea) {
        currentUserArea.textContent = profile.area || "Area not set";
      }

      await loadCategories(categoryField);
      clearMessage(feedMessage);
    } catch (error) {
      showMessage(feedMessage, getFriendlyError(error), "error");
      return;
    }

    attachLogoutHandler(feedMessage);

    onSnapshot(
      query(collection(db, "posts"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const posts = snapshot.docs.map((postDoc) => ({
          id: postDoc.id,
          ...postDoc.data(),
        }));

        renderPosts(feedList, posts, user.uid);
      },
      (error) => {
        showMessage(feedMessage, getFriendlyError(error), "error");
      }
    );

    postForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearMessage(feedMessage);

      const requestCategory = categoryField.value.trim();
      const requestLocation = locationField.value.trim();
      const requestText = postForm.requestText.value.trim();

      if (!requestCategory) {
        showMessage(feedMessage, "Please choose a category before posting.", "error");
        return;
      }

      if (!requestLocation) {
        showMessage(feedMessage, "Please enter the help required location.", "error");
        return;
      }

      if (!requestText) {
        showMessage(feedMessage, "Please write a help request before posting.", "error");
        return;
      }

      try {
        const profile = await ensureUserProfile(user);
        await createPost(profile, categoryField, requestLocation, requestText);
        postForm.reset();
        showMessage(feedMessage, "Your request was added to the feed.", "success");
      } catch (error) {
        showMessage(feedMessage, getFriendlyError(error), "error");
      }
    });

    feedList.addEventListener("click", async (event) => {
      const clickedButton = event.target.closest("[data-action='toggle-status']");

      if (!clickedButton) {
        return;
      }

      const postId = clickedButton.dataset.id;

      try {
        const postSnapshot = await getDoc(doc(db, "posts", postId));

        if (!postSnapshot.exists()) {
          showMessage(feedMessage, "That post no longer exists.", "error");
          return;
        }

        const post = { id: postSnapshot.id, ...postSnapshot.data() };

        if (post.authorId !== user.uid) {
          showMessage(feedMessage, "Only the post author can change the status.", "error");
          return;
        }

        await togglePostStatus(post);
      } catch (error) {
        showMessage(feedMessage, getFriendlyError(error), "error");
      }
    });
  });
}

function initializePostPage() {
  const detailContainer = document.getElementById("post-detail");
  const commentsContainer = document.getElementById("post-comments");
  const commentForm = document.getElementById("detail-comment-form");
  const commentMessage = document.getElementById("detail-message");
  const detailUserName = document.getElementById("detail-user-name");
  const detailUserArea = document.getElementById("detail-user-area");

  if (!detailContainer || !commentsContainer || !commentForm) {
    return;
  }

  requireAuthRedirect(async (user) => {
    let profile;

    try {
      profile = await ensureUserProfile(user);
      detailUserName.textContent = profile.displayName;
      if (detailUserArea) {
        detailUserArea.textContent = profile.area || "Area not set";
      }
    } catch (error) {
      showMessage(commentMessage, getFriendlyError(error), "error");
      return;
    }

    attachLogoutHandler(commentMessage);

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");

    if (!postId) {
      detailContainer.innerHTML = `
        <div class="section-heading">
          <p class="section-label">Post Details</p>
          <h1>Post not found</h1>
          <p>Open this page from the feed to view a specific request.</p>
        </div>
      `;
      commentForm.classList.add("hidden");
      return;
    }

    const postRef = doc(db, "posts", postId);
    const commentsRef = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));

    onSnapshot(
      postRef,
      (postSnapshot) => {
        if (!postSnapshot.exists()) {
          detailContainer.innerHTML = `
            <div class="section-heading">
              <p class="section-label">Post Details</p>
              <h1>Post not found</h1>
              <p>This request is not available right now.</p>
            </div>
          `;
          commentsContainer.innerHTML = "";
          commentForm.classList.add("hidden");
          return;
        }

        commentForm.classList.remove("hidden");
        const post = { id: postSnapshot.id, ...postSnapshot.data() };
        renderPostDetail(detailContainer, post, user.uid);
      },
      (error) => {
        showMessage(commentMessage, getFriendlyError(error), "error");
      }
    );

    onSnapshot(
      commentsRef,
      (snapshot) => {
        const comments = snapshot.docs.map((commentDoc) => ({
          id: commentDoc.id,
          ...commentDoc.data(),
        }));

        renderComments(commentsContainer, comments);
      },
      (error) => {
        showMessage(commentMessage, getFriendlyError(error), "error");
      }
    );

    detailContainer.addEventListener("click", async (event) => {
      const toggleButton = event.target.closest("[data-action='toggle-detail-status']");

      if (!toggleButton) {
        return;
      }

      try {
        const postSnapshot = await getDoc(postRef);

        if (!postSnapshot.exists()) {
          showMessage(commentMessage, "That post no longer exists.", "error");
          return;
        }

        const post = { id: postSnapshot.id, ...postSnapshot.data() };

        if (post.authorId !== user.uid) {
          showMessage(commentMessage, "Only the post author can change the status.", "error");
          return;
        }

        await togglePostStatus(post);
      } catch (error) {
        showMessage(commentMessage, getFriendlyError(error), "error");
      }
    });

    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearMessage(commentMessage);

      const commentText = commentForm.detailCommentText.value.trim();

      if (!commentText) {
        showMessage(commentMessage, "Please write a comment before submitting.", "error");
        return;
      }

      try {
        await addCommentToPost(postId, profile, commentText);
        commentForm.reset();
        showMessage(commentMessage, "Your comment was added.", "success");
      } catch (error) {
        showMessage(commentMessage, getFriendlyError(error), "error");
      }
    });
  });
}

function initializeProfilePage() {
  const profileForm = document.getElementById("profile-form");
  const profileMessage = document.getElementById("profile-message");
  const profileSummaryName = document.getElementById("profile-summary-name");
  const profileSummaryArea = document.getElementById("profile-summary-area");

  if (!profileForm) {
    return;
  }

  requireAuthRedirect(async (user) => {
    let profile;

    try {
      profile = await ensureUserProfile(user);
    } catch (error) {
      showMessage(profileMessage, getFriendlyError(error), "error");
      return;
    }

    attachLogoutHandler(profileMessage);

    profileSummaryName.textContent = profile.displayName;
    profileSummaryArea.textContent = profile.area || "Area not set";

    profileForm.profileName.value = profile.displayName || "";
    profileForm.profileEmail.value = profile.email || "";
    profileForm.profileArea.value = profile.area || "";

    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearMessage(profileMessage);

      const displayName = profileForm.profileName.value.trim();
      const area = profileForm.profileArea.value.trim();

      if (!displayName || !area) {
        showMessage(profileMessage, "Please fill in all profile fields.", "error");
        return;
      }

      try {
        await updateUserProfile(user.uid, {
          displayName,
          area,
        });

        profileSummaryName.textContent = displayName;
        profileSummaryArea.textContent = area;
        showMessage(profileMessage, "Profile updated successfully.", "success");
      } catch (error) {
        showMessage(profileMessage, getFriendlyError(error), "error");
      }
    });
  });
}

function attachLogoutHandler(messageElement) {
  const logoutButton = document.getElementById("logout-btn");

  if (!logoutButton || logoutButton.dataset.bound === "true") {
    return;
  }

  logoutButton.dataset.bound = "true";

  logoutButton.addEventListener("click", async () => {
    try {
      await signOutUser();
      window.location.href = "login.html";
    } catch (error) {
      showMessage(messageElement, getFriendlyError(error), "error");
    }
  });
}

initializeLoginPage();
initializeHomePage();
initializeFeedPage();
initializePostPage();
initializeProfilePage();
