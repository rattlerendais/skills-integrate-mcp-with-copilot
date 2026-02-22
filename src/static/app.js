document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const userMenu = document.getElementById("user-menu");
  const authBtn = document.getElementById("auth-btn");
  const userStatus = document.getElementById("user-status");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeBtn = document.querySelector(".close");
  const loginMessage = document.getElementById("login-message");

  // Store authentication state
  let authToken = localStorage.getItem("authToken");
  let currentUsername = localStorage.getItem("currentUsername");

  // Function to update UI based on authentication state
  function updateAuthUI() {
    if (authToken && currentUsername) {
      userStatus.textContent = `Logged in as: ${currentUsername}`;
      authBtn.textContent = "Logout";
      signupContainer.classList.remove("hidden");
    } else {
      userStatus.textContent = "Not logged in";
      authBtn.textContent = "Login";
      signupContainer.classList.add("hidden");
    }
  }

  // User icon click handler
  userIcon.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (e.target !== userIcon && e.target !== userMenu && !userMenu.contains(e.target)) {
      userMenu.classList.add("hidden");
    }
  });

  // Auth button click handler
  authBtn.addEventListener("click", () => {
    if (authToken) {
      // Logout
      logout();
    } else {
      // Show login modal
      loginModal.classList.remove("hidden");
      userMenu.classList.add("hidden");
    }
  });

  // Close login modal
  closeBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  });

  // Close modal when clicking outside of it
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginMessage.classList.add("hidden");
      loginForm.reset();
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const result = await response.json();
        authToken = result.token;
        currentUsername = result.username;
        
        // Store in localStorage
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("currentUsername", currentUsername);

        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");

        setTimeout(() => {
          loginModal.classList.add("hidden");
          loginMessage.classList.add("hidden");
          loginForm.reset();
          updateAuthUI();
          fetchActivities();
        }, 1000);
      } else {
        loginMessage.textContent = "Invalid username or password";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  async function logout() {
    try {
      await fetch(`/logout?token=${encodeURIComponent(authToken)}`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    // Clear local storage
    authToken = null;
    currentUsername = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUsername");

    updateAuthUI();
    fetchActivities();
    userMenu.classList.add("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear activity options except the placeholder
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only if authenticated
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) => {
                      const deleteBtn =
                        authToken && currentUsername
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : "";
                      return `<li><span class="participant-email">${email}</span>${deleteBtn}</li>`;
                    }
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    
    if (!authToken) {
      messageDiv.textContent = "You must be logged in to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      messageDiv.textContent = "You must be logged in to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register student. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
