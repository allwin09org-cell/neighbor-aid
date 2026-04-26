# AGENTS.md

## Project Overview

Neighbor Aid is a simple college project built to demonstrate how a local community platform can let neighbors ask for help and respond to each other.

The current version is a frontend-only demo with:
- A home page
- A Firebase-powered login and signup page
- A separate feed page
- A separate post detail page
- A separate profile page
- Categories for help requests
- Help-required location attached to each request
- Open and resolved request status

## Project Type

Static frontend web app for a college project.

## Tech Stack

- `HTML` for page structure
- `CSS` for styling
- `JavaScript` for interactivity
- Firebase Authentication for login and signup
- Cloud Firestore for users, categories, posts, and comments

No framework and no bundler are used in this version. Firebase is used directly from browser modules.

## Structure

- [index.html](/Users/ralph/VibeProjects/neighbor_aid/public/index.html) is the landing page
- [login.html](/Users/ralph/VibeProjects/neighbor_aid/public/login.html) contains Firebase login and signup
- [feed.html](/Users/ralph/VibeProjects/neighbor_aid/public/feed.html) contains the community feed page
- [post.html](/Users/ralph/VibeProjects/neighbor_aid/public/post.html) shows one request and its comments
- [profile.html](/Users/ralph/VibeProjects/neighbor_aid/public/profile.html) lets one user edit their own profile
- [firebase-config.js](/Users/ralph/VibeProjects/neighbor_aid/public/firebase-config.js) initializes Firebase and connects to emulators on localhost
- [style.css](/Users/ralph/VibeProjects/neighbor_aid/public/style.css) contains all shared styling
- [script.js](/Users/ralph/VibeProjects/neighbor_aid/public/script.js) contains Firebase auth flow, Firestore reads/writes, categories, feed rendering, post detail rendering, profile editing, comments, and status toggling

## Working Rules

- Act like a degree-college beginner who is learning web development
- Prefer plain `HTML`, `CSS`, and `JavaScript`
- Keep the code simple, direct, and easy to explain in viva or submission
- Avoid professional-level over-structuring unless explicitly requested
- It is okay to keep the project in a small number of files
- Use readable names and only a few helpful comments when needed
- Focus on showing the idea clearly rather than making it production-ready

## Current Scope

- Firebase email/password authentication
- Firestore-backed users, categories, posts, and comments
- User profile stores personal details only
- Help request stores the required location
- Local Firebase emulators for development
- No custom backend server

## Future Scope

If this project is expanded later:
- Add stronger role-based permissions for categories and moderation
- Add image uploads or attachments with Firebase Storage
- Add persistent user profiles and saved request history
- Add notifications or better matching between helpers and requesters

## Commands

- Open `public/index.html` in a browser to view the project
- Use a local server because pages now use JavaScript modules
- Use `public/login.html` to sign up or log in with Firebase Auth
- After login, use `public/feed.html` for posting, `public/post.html` for comments, and `public/profile.html` for personal profile updates
- Start Firebase emulators for Auth and Firestore during development
- Open `post.html?id=POST_ID` through the feed to view one request and its comments
- If a local server is needed, use a simple static server only

## Patterns To Follow

- Keep everything beginner-friendly
- Prefer one clear solution over a clever one
- Add features in small steps
- Keep page structure simple and beginner-friendly
- Do not add frameworks or backend code without a direct request
- Prefer Firebase Web SDK modules over extra tooling

## Key Files

- [index.html](/Users/ralph/VibeProjects/neighbor_aid/public/index.html)
- [login.html](/Users/ralph/VibeProjects/neighbor_aid/public/login.html)
- [feed.html](/Users/ralph/VibeProjects/neighbor_aid/public/feed.html)
- [post.html](/Users/ralph/VibeProjects/neighbor_aid/public/post.html)
- [profile.html](/Users/ralph/VibeProjects/neighbor_aid/public/profile.html)
- [firebase-config.js](/Users/ralph/VibeProjects/neighbor_aid/public/firebase-config.js)
- [style.css](/Users/ralph/VibeProjects/neighbor_aid/public/style.css)
- [script.js](/Users/ralph/VibeProjects/neighbor_aid/public/script.js)
- [AGENTS.md](/Users/ralph/VibeProjects/neighbor_aid/AGENTS.md)
