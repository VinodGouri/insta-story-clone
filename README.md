# insta-story-clone
 A client-side Instagram Stories clone. Upload images that auto-expire in 24 hours. Features: swipe navigation, progress bars, X button to close, keyboard shortcuts, responsive design. Built with HTML/CSS/JavaScript using localStorage. No backend required.
# Instagram Stories Clone

A complete client-side implementation of Instagram Stories with 24-hour auto-expiration.

## 🎯 Features
- 📸 Upload images with auto-resize (1080x1920px max)
- ⏰ 24-hour automatic expiration
- ✋ Swipe navigation for mobile
- ⌨️ Keyboard shortcuts (arrows, space, escape)
- ❌ X button to close viewer
- 💾 LocalStorage persistence
- 📱 Fully responsive design

## 🚀 Live Demo
[View Live Project](https://VinodGouri.github.io/instagram-stories-clone/)

## 🛠️ Tech Stack
- HTML5, CSS3, JavaScript (ES6)
- LocalStorage API for data persistence
- Canvas API for image processing
- FileReader API for uploads

## 📦 Installation & Usage
1. Clone: `git clone https://github.com/VinodGouri/instagram-stories-clone.git`
2. Open `igclone.html` in browser
3. Click + to upload stories
4. Click stories to view, X to close

## 🔧 How It Works
- Images converted to base64 and stored in localStorage
- Background timer removes expired stories every minute
- Each story has 5-second progress bar
- X button and Escape key close viewer

## 👨‍💻 Author
Vinod GOURI | 3rd Year B.Tech Student  
GitHub: @VinodGouri  
Built for learning frontend development
