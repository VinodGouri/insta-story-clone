class StoryManager {
    constructor() {
        this.stories = JSON.parse(localStorage.getItem('stories') || '[]');
        this.currentStoryIndex = 0;
        this.currentProgress = 0;
        this.progressInterval = null;
        this.isPaused = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.swipeThreshold = 50;
        
        this.init();
    }

    init() {
        this.renderStories();
        this.setupEventListeners();
        this.cleanupExpiredStories();
    }

    renderStories() {
        const container = document.getElementById('storiesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (this.stories.length === 0) {
            emptyState.style.display = 'block';
            container.innerHTML = '';
            
            // Only show add button when no stories
            const addBtn = document.createElement('div');
            addBtn.className = 'add-story-btn';
            addBtn.innerHTML = '+';
            addBtn.onclick = () => this.showUploadModal();
            container.appendChild(addBtn);
            return;
        }
        
        emptyState.style.display = 'none';
        container.innerHTML = '';
        
        // Add button first
        const addBtn = document.createElement('div');
        addBtn.className = 'add-story-btn';
        addBtn.innerHTML = '+';
        addBtn.onclick = () => this.showUploadModal();
        container.appendChild(addBtn);
        
        // Add existing stories
        this.stories.forEach((story, index) => {
            const storyElement = document.createElement('div');
            storyElement.className = 'story-item';
            if (this.isStoryExpiringSoon(story)) {
                storyElement.classList.add('expiring-soon');
            }
            storyElement.onclick = () => this.openStoryViewer(index);
            
            const ring = document.createElement('div');
            ring.className = 'story-ring';
            
            const img = document.createElement('img');
            img.className = 'story-image';
            img.src = story.image;
            img.alt = `Story by ${story.username}`;
            img.loading = 'lazy';
            
            const username = document.createElement('div');
            username.className = 'story-username';
            username.textContent = story.username;
            
            const timestamp = document.createElement('div');
            timestamp.className = 'story-timestamp';
            timestamp.textContent = this.getTimeAgo(story.timestamp);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete story';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteStory(index);
            };
            
            ring.appendChild(img);
            storyElement.appendChild(ring);
            storyElement.appendChild(username);
            storyElement.appendChild(timestamp);
            storyElement.appendChild(deleteBtn);
            container.appendChild(storyElement);
        });
    }

    showUploadModal() {
        document.getElementById('uploadModal').style.display = 'flex';
        document.getElementById('modalOverlay').style.display = 'block';
        document.getElementById('imageInput').focus();
    }

    closeUploadModal() {
        document.getElementById('uploadModal').style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
        document.getElementById('imageInput').value = '';
        document.getElementById('uploadBtn').disabled = true;
    }

    async uploadStory() {
        const input = document.getElementById('imageInput');
        const file = input.files[0];
        
        if (!file) {
            alert('Please select an image first!');
            return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image size should be less than 10MB');
            return;
        }
        
        const uploadBtn = document.getElementById('uploadBtn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
        
        try {
            const base64 = await this.resizeAndConvertToBase64(file);
            const story = {
                id: Date.now(),
                username: 'You',
                image: base64,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
            };
            
            this.stories.unshift(story);
            this.saveStories();
            this.renderStories();
            this.closeUploadModal();
            
            // Open the newly uploaded story
            setTimeout(() => this.openStoryViewer(0), 300);
        } catch (error) {
            alert('Error uploading image: ' + error.message);
            console.error('Upload error:', error);
        } finally {
            uploadBtn.textContent = originalText;
        }
    }

    resizeAndConvertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            reader.onload = (e) => {
                img.onload = () => {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;
                    const maxWidth = 1080;
                    const maxHeight = 1920;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Apply image smoothing for better quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to base64 with compression
                    const quality = 0.85; // Good quality with compression
                    const base64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    openStoryViewer(index) {
        if (index < 0 || index >= this.stories.length) return;
        
        this.currentStoryIndex = index;
        this.currentProgress = 0;
        this.isPaused = false;
        
        const viewer = document.getElementById('storyViewer');
        const story = this.stories[index];
        
        document.getElementById('viewerImage').src = story.image;
        document.getElementById('viewerUsername').textContent = story.username;
        document.getElementById('viewerTime').textContent = this.getTimeAgo(story.timestamp);
        document.getElementById('viewerAvatar').src = story.image;
        
        // Create progress bars
        const progressContainer = document.getElementById('progressContainer');
        progressContainer.innerHTML = '';
        
        this.stories.forEach((_, i) => {
            const bar = document.createElement('div');
            bar.className = 'story-progress-bar';
            const fill = document.createElement('div');
            fill.className = 'story-progress-fill';
            fill.style.width = i === index ? '0%' : i < index ? '100%' : '0%';
            bar.appendChild(fill);
            progressContainer.appendChild(bar);
        });
        
        viewer.style.display = 'flex';
        this.startProgress();
    }

    closeStoryViewer() {
        document.getElementById('storyViewer').style.display = 'none';
        this.stopProgress();
    }

    startProgress() {
        this.stopProgress();
        const storyDuration = 5000; // 5 seconds per story
        const updateInterval = 50; // Update every 50ms
        const increment = (updateInterval / storyDuration) * 100;
        
        this.progressInterval = setInterval(() => {
            if (!this.isPaused) {
                this.currentProgress += increment;
                const fills = document.querySelectorAll('.story-progress-fill');
                if (fills[this.currentStoryIndex]) {
                    fills[this.currentStoryIndex].style.width = `${Math.min(this.currentProgress, 100)}%`;
                }
                
                if (this.currentProgress >= 100) {
                    this.nextStory();
                }
            }
        }, updateInterval);
    }

    stopProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    pauseProgress() {
        this.isPaused = true;
    }

    resumeProgress() {
        this.isPaused = false;
    }

    nextStory() {
        if (this.currentStoryIndex < this.stories.length - 1) {
            this.currentStoryIndex++;
            this.currentProgress = 0;
            this.openStoryViewer(this.currentStoryIndex);
        } else {
            this.closeStoryViewer();
        }
    }

    prevStory() {
        if (this.currentStoryIndex > 0) {
            this.currentStoryIndex--;
            this.currentProgress = 0;
            this.openStoryViewer(this.currentStoryIndex);
        }
    }

    deleteStory(index) {
        if (confirm('Are you sure you want to delete this story?')) {
            this.stories.splice(index, 1);
            this.saveStories();
            this.renderStories();
            
            if (document.getElementById('storyViewer').style.display === 'flex') {
                if (index === this.currentStoryIndex) {
                    if (this.stories.length === 0) {
                        this.closeStoryViewer();
                    } else if (this.currentStoryIndex >= this.stories.length) {
                        this.currentStoryIndex = this.stories.length - 1;
                        this.openStoryViewer(this.currentStoryIndex);
                    } else {
                        this.openStoryViewer(this.currentStoryIndex);
                    }
                } else if (index < this.currentStoryIndex) {
                    this.currentStoryIndex--;
                }
            }
        }
    }

    cleanupExpiredStories() {
        const now = Date.now();
        const initialLength = this.stories.length;
        this.stories = this.stories.filter(story => story.expiresAt > now);
        
        if (this.stories.length !== initialLength) {
            this.saveStories();
            this.renderStories();
        }
        
        // Schedule next cleanup
        setTimeout(() => this.cleanupExpiredStories(), 60000); // Check every minute
    }

    isStoryExpiringSoon(story) {
        const hoursLeft = (story.expiresAt - Date.now()) / (60 * 60 * 1000);
        return hoursLeft < 6; // Less than 6 hours left
    }

    saveStories() {
        try {
            localStorage.setItem('stories', JSON.stringify(this.stories));
        } catch (error) {
            console.error('Failed to save stories:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Storage is full. Some stories may not be saved.');
                // Remove oldest stories if storage is full
                if (this.stories.length > 10) {
                    this.stories = this.stories.slice(-10);
                    this.saveStories();
                }
            }
        }
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return 'Just now';
    }

    setupEventListeners() {
        // Image input change
        document.getElementById('imageInput').addEventListener('change', (e) => {
            document.getElementById('uploadBtn').disabled = !e.target.files.length;
        });
        
        // Close modal when clicking overlay
        document.getElementById('modalOverlay').addEventListener('click', () => {
            this.closeUploadModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('storyViewer').style.display === 'flex') {
                e.preventDefault();
                if (e.key === 'Escape' || e.key === 'q') {
                    this.closeStoryViewer();
                } else if (e.key === 'ArrowRight' || e.key === 'd') {
                    this.nextStory();
                } else if (e.key === 'ArrowLeft' || e.key === 'a') {
                    this.prevStory();
                } else if (e.key === ' ') {
                    this.isPaused ? this.resumeProgress() : this.pauseProgress();
                }
            }
        });
        
        // Touch events for swiping
        const viewer = document.getElementById('storyViewer');
        
        viewer.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.pauseProgress();
        }, { passive: true });
        
        viewer.addEventListener('touchmove', (e) => {
            this.touchEndX = e.touches[0].clientX;
        }, { passive: true });
        
        viewer.addEventListener('touchend', () => {
            const diff = this.touchStartX - this.touchEndX;
            
            if (Math.abs(diff) > this.swipeThreshold) {
                if (diff > 0) {
                    this.nextStory();
                } else {
                    this.prevStory();
                }
            } else {
                this.resumeProgress();
            }
        }, { passive: true });
        
        // Click events for navigation
        viewer.addEventListener('click', (e) => {
            const rect = viewer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            
            if (clickX < width * 0.3) {
                this.prevStory();
            } else if (clickX > width * 0.7) {
                this.nextStory();
            }
        });
        
        // Prevent right-click on images
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('story-viewer-image') || 
                e.target.classList.contains('story-image')) {
                e.preventDefault();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (document.getElementById('storyViewer').style.display === 'flex') {
                // Re-center the viewer content
                const viewerImg = document.getElementById('viewerImage');
                viewerImg.style.maxWidth = window.innerWidth > 1080 ? '1080px' : '100%';
            }
        });
    }
}

// Initialize the app
const storyManager = new StoryManager();

// Global functions for HTML onclick handlers
function uploadStory() {
    storyManager.uploadStory();
}

function closeUploadModal() {
    storyManager.closeUploadModal();
}

function closeStoryViewer() {
    storyManager.closeStoryViewer();
}

function prevStory() {
    storyManager.prevStory();
}

function nextStory() {
    storyManager.nextStory();
}

// Handle Enter key in upload modal
document.getElementById('imageInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !document.getElementById('uploadBtn').disabled) {
        uploadStory();
    }
});