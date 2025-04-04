document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const postContent = document.getElementById('post-content');
    const postButton = document.getElementById('post-button');
    const postFeed = document.getElementById('post-feed');
    const aiProfilesList = document.getElementById('ai-profiles-list');
    const settingsLink = document.querySelector('.settings-link');
    
    // Modal elements
    const saveModal = document.getElementById('save-posts-modal');
    const loadModal = document.getElementById('load-posts-modal');
    const saveYesBtn = document.getElementById('save-posts-yes');
    const saveNoBtn = document.getElementById('save-posts-no');
    const loadYesBtn = document.getElementById('load-posts-yes');
    const loadNoBtn = document.getElementById('load-posts-no');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const savedPostsDetails = document.getElementById('saved-posts-details');
    
    // Pagination variables
    let currentPage = 1;
    let totalPages = 1;
    
    // Posts data
    let allPosts = [];

    // Load AI profiles
    fetchProfiles();
    
    // Check for saved posts on load
    checkSavedPosts();
    
    // Load posts
    fetchPosts();
    
    // Event listeners
    postButton.addEventListener('click', createPost);
    
    // Add event listener for Enter key to trigger Post button
    postContent.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            postButton.click();
        }
    });
    
    // Add event listener for settings link
    if (settingsLink) {
        settingsLink.addEventListener('click', function(e) {
            // Set a flag in sessionStorage to indicate intentional navigation to settings
            sessionStorage.setItem('navigatingToSettings', 'true');
        });
    }
    
    // Modal event listeners
    saveYesBtn.addEventListener('click', savePosts);
    saveNoBtn.addEventListener('click', () => {
        saveModal.style.display = 'none';
    });
    
    loadYesBtn.addEventListener('click', loadPosts);
    loadNoBtn.addEventListener('click', () => {
        loadModal.style.display = 'none';
    });
    
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            saveModal.style.display = 'none';
            loadModal.style.display = 'none';
        });
    });
    
    // Window events for modals
    window.addEventListener('click', function(e) {
        if (e.target == saveModal) {
            saveModal.style.display = 'none';
        }
        if (e.target == loadModal) {
            loadModal.style.display = 'none';
        }
    });
    
    // Functions
    function fetchProfiles() {
        fetch('/api/profiles')
            .then(response => response.json())
            .then(profiles => {
                aiProfilesList.innerHTML = '';
                profiles.forEach(profile => {
                    aiProfilesList.innerHTML += `
                        <div class="ai-profile">
                            <img src="/static/avatars/${profile.avatar}" alt="${profile.name}" class="ai-profile-avatar">
                            <div class="ai-profile-info">
                                <h4>${profile.name}</h4>
                                <p>${profile.bio}</p>
                            </div>
                        </div>
                    `;
                });
            })
            .catch(error => {
                console.error('Error fetching profiles:', error);
                aiProfilesList.innerHTML = '<p>Failed to load AI profiles</p>';
            });
    }
    
    function fetchPosts(page = 1) {
        postFeed.innerHTML = '<div class="loading">Loading posts...</div>';

        return fetch(`/api/posts/page/${page}`)
            .then(response => response.json())
            .then(data => {
                const posts = data.posts;
                totalPages = data.total_pages;
                currentPage = data.current_page;

                allPosts = posts;

                postFeed.innerHTML = '';
                if (posts.length === 0) {
                    postFeed.innerHTML = '<div class="loading">No posts yet. Be the first to post!</div>';
                    return;
                }

                posts.forEach(post => {
                    postFeed.innerHTML += createPostHTML(post);
                });

                addPaginationControls();

                document.querySelectorAll('.like-button').forEach(button => {
                    button.addEventListener('click', function() {
                        const postId = this.getAttribute('data-post-id');
                        const likeCount = this.querySelector('.like-count');
                        likeCount.textContent = parseInt(likeCount.textContent) + 1;
                    });
                });

                document.querySelectorAll('.thread-toggle').forEach(button => {
                    button.addEventListener('click', function() {
                        const postId = this.getAttribute('data-post-id');
                        const commentsCount = this.getAttribute('data-comments-count');
                        const comments = document.querySelector(`#post-${postId} .post-comments`);
                        if (comments) {
                            if (comments.style.display === 'none' || comments.style.display === '') {
                                comments.style.display = 'block';
                                this.textContent = `💬 ${commentsCount} ▲`;
                            } else {
                                comments.style.display = 'none';
                                this.textContent = `💬 ${commentsCount} ▼`;
                            }
                        }
                    });
                });

                document.querySelectorAll('.comment-submit').forEach(button => {
                    button.addEventListener('click', function() {
                        const postId = this.getAttribute('data-post-id');
                        const inputElement = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
                        const commentContent = inputElement.value.trim();
                        
                        if (commentContent) {
                            // Disable button and show loading state
                            this.disabled = true;
                            this.textContent = 'Sending...';
                            
                            // Send the comment to the server
                            submitComment(postId, commentContent, this, inputElement);
                        }
                    });
                });

                document.querySelectorAll('.comment-input').forEach(input => {
                    input.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const postId = this.getAttribute('data-post-id');
                            const submitButton = document.querySelector(`.comment-submit[data-post-id="${postId}"]`);
                            const commentContent = this.value.trim();
                            
                            if (commentContent) {
                                // Disable button and show loading state
                                submitButton.disabled = true;
                                submitButton.textContent = 'Sending...';
                                
                                // Send the comment to the server
                                submitComment(postId, commentContent, submitButton, this);
                            }
                        }
                    });
                });

                document.querySelectorAll('.thread-toggle').forEach(toggle => {
                    const postId = toggle.getAttribute('data-post-id');
                    const commentsCount = document.querySelectorAll(`#post-${postId} .post-comments .comment`).length;
                    toggle.setAttribute('data-comments-count', commentsCount);
                    toggle.textContent = `💬 ${commentsCount} ▼`;
                });

                return posts;
            })
            .catch(error => {
                console.error('Error fetching posts:', error);
                postFeed.innerHTML = '<div class="loading">Failed to load posts</div>';
                return [];
            });
    }
    
    function createPost() {
        const content = postContent.value.trim();

        if (!content) {
            alert('Please enter some content for your post');
            return;
        }

        postButton.disabled = true;
        postButton.textContent = 'Posting...';

        fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        })
        .then(response => response.json())
        .then(post => {
            postContent.value = '';
            postButton.disabled = false;
            postButton.textContent = 'Post';

            fetchPosts().then(() => {
                // Open the comments thread immediately
                const thread = document.querySelector(`#post-${post.id} .post-comments`);
                const toggleButton = document.querySelector(`.thread-toggle[data-post-id="${post.id}"]`);
                if (thread && toggleButton) {
                    thread.style.display = 'block';
                    const commentsCount = toggleButton.getAttribute('data-comments-count');
                    toggleButton.textContent = `💬 ${commentsCount} ▲`;
                }
            });
        })
        .catch(error => {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
            postButton.disabled = false;
            postButton.textContent = 'Post';
        });
    }
    
    function createPostHTML(post) {
        const date = new Date(post.timestamp * 1000);
        const timeString = date.toLocaleString();
        
        let commentsHTML = '';
        const commentsCount = post.comments ? post.comments.length : 0;
        
        if (commentsCount > 0) {
            commentsHTML = '<div class="post-comments" style="display: none;">'; // Start with comments hidden
            post.comments.forEach(comment => {
                const commentDate = new Date(comment.timestamp * 1000);
                const commentTimeString = commentDate.toLocaleString();
                
                commentsHTML += `
                    <div class="comment">
                        <img src="/static/avatars/${comment.author.avatar}" alt="${comment.author.name}" class="comment-avatar">
                        <div class="comment-content">
                            <span class="comment-author">${comment.author.name}</span>
                            <div class="post-time">${commentTimeString}</div>
                            <p>${comment.content}</p>
                        </div>
                    </div>
                `;
            });
            
            // Add chat input box at the bottom of comments
            commentsHTML += `
                <div class="comment-form">
                    <img src="/static/avatars/user.png" alt="Your Profile" class="comment-avatar">
                    <div class="comment-input-container">
                        <input type="text" class="comment-input" placeholder="Continue the conversation..." data-post-id="${post.id}">
                        <button class="comment-submit" data-post-id="${post.id}">Send</button>
                    </div>
                </div>
            `;
            
            commentsHTML += '</div>';
        } else {
            // If no comments yet, still add the chat input box but inside the hidden comments div
            commentsHTML = `
                <div class="post-comments" style="display: none;">
                    <div class="comment-form">
                        <img src="/static/avatars/user.png" alt="Your Profile" class="comment-avatar">
                        <div class="comment-input-container">
                            <input type="text" class="comment-input" placeholder="Start a conversation..." data-post-id="${post.id}">
                            <button class="comment-submit" data-post-id="${post.id}">Send</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="post" id="post-${post.id}">
                <div class="post-header">
                    <img src="/static/avatars/${post.author.avatar}" alt="${post.author.name}" class="post-avatar">
                    <div>
                        <span class="post-author">${post.author.name}</span>
                        <div class="post-time">${timeString}</div>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <span class="post-action like-button" data-post-id="${post.id}">
                        ❤️ <span class="like-count">${post.likes}</span>
                    </span>
                    <span class="post-action thread-toggle" data-post-id="${post.id}" data-comments-count="${commentsCount}">
                        💬 ${commentsCount} ${commentsCount > 0 ? '▼' : ''}
                    </span>
                </div>
                ${commentsHTML}
            </div>
        `;
    }
    
    function submitComment(postId, content, buttonElement, inputElement) {
        fetch('/api/posts/' + postId + '/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        })
        .then(response => response.json())
        .then(data => {
            // Reset input field
            inputElement.value = '';
            
            // Re-enable button
            buttonElement.disabled = false;
            buttonElement.textContent = 'Send';
            
            if (data.error) {
                console.error('Error submitting comment:', data.error);
                alert('Failed to submit comment: ' + data.error);
                return;
            }
            
            // Store the IDs of currently open threads before refreshing
            const openThreadIds = [];
            document.querySelectorAll('.post-comments').forEach(thread => {
                if (thread.style.display === 'block') {
                    const postElement = thread.closest('.post');
                    if (postElement) {
                        const postId = postElement.id.replace('post-', '');
                        openThreadIds.push(postId);
                    }
                }
            });
            
            // Refresh the posts to show the new comment and AI responses
            fetchPosts().then(() => {
                // Reopen threads that were open before
                openThreadIds.forEach(id => {
                    const thread = document.querySelector(`#post-${id} .post-comments`);
                    const toggleButton = document.querySelector(`.thread-toggle[data-post-id="${id}"]`);
                    if (thread && toggleButton) {
                        thread.style.display = 'block';
                        const commentsCount = toggleButton.getAttribute('data-comments-count');
                        toggleButton.textContent = `💬 ${commentsCount} ▲`;
                    }
                });
                
                // Always make sure the thread where the comment was just added is open
                const currentThread = document.querySelector(`#post-${postId} .post-comments`);
                const currentToggle = document.querySelector(`.thread-toggle[data-post-id="${postId}"]`);
                if (currentThread && currentToggle) {
                    currentThread.style.display = 'block';
                    const commentsCount = currentToggle.getAttribute('data-comments-count');
                    currentToggle.textContent = `💬 ${commentsCount} ▲`;
                }
            });
        })
        .catch(error => {
            console.error('Error submitting comment:', error);
            
            // Re-enable button
            buttonElement.disabled = false;
            buttonElement.textContent = 'Send';
            
            alert('Failed to submit comment. Please try again.');
        });
    }

    function addPaginationControls() {
        // Create pagination container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        
        // Previous page button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-button';
        prevButton.textContent = '← Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchPosts(currentPage - 1);
            }
        });
        
        // Page indicator
        const pageIndicator = document.createElement('span');
        pageIndicator.className = 'page-indicator';
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Next page button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.textContent = 'Next →';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                fetchPosts(currentPage + 1);
            }
        });
        
        // Add buttons to container
        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageIndicator);
        paginationContainer.appendChild(nextButton);
        
        // Add pagination controls to the feed
        postFeed.appendChild(paginationContainer);
    }
    
    // Save and Load Posts Functions
    function savePosts() {
        if (allPosts.length === 0) {
            alert('No posts to save.');
            saveModal.style.display = 'none';
            return;
        }
        
        // Create a JSON object with posts data and timestamp
        const saveData = {
            posts: allPosts,
            timestamp: new Date().toLocaleString(),
            count: allPosts.length
        };
        
        // Convert to JSON string
        const jsonData = JSON.stringify(saveData);
        
        // Create a blob and download link
        const blob = new Blob([jsonData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mycrowd_posts_' + new Date().toISOString().split('T')[0] + '.json';
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            saveModal.style.display = 'none';
        }, 0);
        
        // Save a reference that we have saved posts
        localStorage.setItem('lastSavedPosts', JSON.stringify({
            timestamp: new Date().toISOString(),
            count: allPosts.length
        }));
    }
    
    function loadPosts() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.posts || !Array.isArray(data.posts)) {
                        throw new Error('Invalid file format');
                    }
                    
                    // Send the loaded posts to the server
                    fetch('/api/posts/load', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({posts: data.posts})
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to load posts');
                        }
                        return response.json();
                    })
                    .then(result => {
                        // Refresh posts display
                        fetchPosts();
                        loadModal.style.display = 'none';
                        
                        // Show success message
                        alert(`Successfully loaded ${data.posts.length} posts!`);
                    })
                    .catch(error => {
                        console.error('Error loading posts to server:', error);
                        alert('Failed to load posts: ' + error.message);
                    });
                    
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                    alert('Error loading file: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        });
        
        // Trigger file selection
        fileInput.click();
    }
    
    function checkSavedPosts() {
        // Check if we have saved posts info in localStorage
        const savedInfo = localStorage.getItem('lastSavedPosts');
        
        if (savedInfo) {
            try {
                const info = JSON.parse(savedInfo);
                const date = new Date(info.timestamp);
                const formattedDate = date.toLocaleString();
                
                // Show load modal if there are saved posts
                savedPostsDetails.textContent = `Last saved: ${formattedDate} (${info.count} posts)`;
                
                // Add a button to open load dialog
                const loadButton = document.createElement('button');
                loadButton.textContent = 'Load Saved Posts';
                loadButton.className = 'btn';
                loadButton.style.marginTop = '15px';
                loadButton.addEventListener('click', function() {
                    loadModal.style.display = 'block';
                });
                
                // Add button to header
                const header = document.querySelector('header');
                if (header) {
                    header.appendChild(loadButton);
                }
                
            } catch (error) {
                console.error('Error parsing saved posts info:', error);
            }
        }
    }
    
    // Create a new save button that explicitly triggers the save modal
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Posts';
    saveButton.className = 'btn';
    saveButton.style.marginTop = '15px';
    saveButton.style.marginLeft = '10px';
    saveButton.addEventListener('click', function() {
        if (allPosts.length > 0) {
            saveModal.style.display = 'block';
        } else {
            alert('No posts to save.');
        }
    });
    
    // Add button to header
    const header = document.querySelector('header');
    if (header) {
        header.appendChild(saveButton);
    }
    
    // Minimal function to call streaming endpoint and append persona response as it arrives
    async function streamPersonaResponse(promptText, textElement) {
        textElement.innerHTML = '';
        const response = await fetch('/api/stream_generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
        });

        if (!response.body) {
            textElement.innerHTML = 'No response body';
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            textElement.innerHTML += chunk;
        }
    }
});
