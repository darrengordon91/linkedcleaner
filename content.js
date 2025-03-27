console.log("✅ LinkedLess Cleaner content.js is running!");
console.log("🟢 LinkedLess: Hot Take / Hot Turd voting loaded!");

chrome.storage.sync.get(null, (settings) => {
    console.log("🔧 Current LinkedLess Cleaner settings:", settings);

    const selectors = {
        post: ".feed-shared-update-v2, .feed-shared-article, .feed-shared-external-video",
        sidebars: [".scaffold-layout__sidebar", ".scaffold-layout__aside"],
        feedRoot: ".scaffold-layout__main, .feed-shared-update-v2, .feed-shared-article, .feed-shared-external-video",
        timeIndicator: "span[class*='feed-shared-time'], span[class*='social-details-social-activity']",
        emojiReactions: [
            "span[class*='reaction-v2']",
            "span[class*='social-details-social-activity']",
            "li[class*='social-details-social-activity']",
            "span[class*='social-details-social-counts']"
        ],
        mediaWrapper: ".feed-shared-update-v2 .feed-shared-image__image-wrapper, .feed-shared-article .feed-shared-image__image-wrapper, .feed-shared-external-video .feed-shared-image__image-wrapper, .feed-shared-update-v2 .ivm-image-view-model, .feed-shared-article .ivm-image-view-model, .feed-shared-external-video .ivm-image-view-model"
    };

    const keywords = [
        { key: "hide_likes", text: [
            "likes this",
            "liked this",
            "likes",
            "celebrates this",
            "celebrated this",
            "loves this",
            "finds this insightful",
            "finds this funny",
            "supports this",
            "reaction",
            "reactions"
        ]},
        { key: "hide_comments", text: ["commented on this", "commented", "replied"] },
        { key: "hide_reposts", text: ["reposted this", "reposted", "shared"] },
        { key: "hide_suggested", text: ["suggested", "recommended", "you might like"] },
        { key: "hide_prompted", text: ["promoted", "sponsored", "advertisement"] }
    ];

    // Create initial style for immediate hiding of new content
    const style = document.createElement('style');
    style.textContent = `
        .feed-shared-update-v2:not(.processed),
        .feed-shared-article:not(.processed),
        .feed-shared-external-video:not(.processed) {
            visibility: hidden !important;
        }

        /* Poop GIF Overlay Styles */
        .poop-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 2;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.9);
            width: 100%;
            height: 100%;
        }

        .poop-overlay.visible {
            opacity: 1;
        }

        .poop-gif {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    `;
    document.head.appendChild(style);

    // Create and add loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'linkedless-toast';
    loadingIndicator.innerHTML = 'Cleaning up your feed<span class="dots"></span>';
    document.body.appendChild(loadingIndicator);

    // Function to remove loading indicator
    function removeLoadingIndicator() {
        setTimeout(() => {
            loadingIndicator.remove();
        }, 3000);
    }

    // Debounce function to limit the rate of processing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function parseTimeString(timeStr) {
        if (!timeStr) return null;
        
        const text = timeStr.trim().toLowerCase();
        
        // Direct match for week/day format (e.g., "2w", "3d", "1m")
        const directMatch = text.match(/^(\d+)([wdm])$/);
        if (directMatch) {
            const value = parseInt(directMatch[1]);
            const unit = directMatch[2];
            
            // Convert to weeks
            switch(unit) {
                case 'w': return value;
                case 'd': return value / 7;
                case 'm': return value * 4;
            }
        }
        
        return null;
    }

    function hasEmojiReaction(post) {
        return selectors.emojiReactions.some(selector => {
            const element = post.querySelector(selector);
            return element !== null;
        });
    }

    function shouldRemovePost(post) {
        // Check for time-based filtering first
        if (settings.hide_old_posts && settings.time_filter) {
            const timeIndicators = post.querySelectorAll(selectors.timeIndicator);
            for (const timeIndicator of timeIndicators) {
                const postAge = parseTimeString(timeIndicator.innerText);
                const limitWeeks = parseInt(settings.time_filter);
                
                if (postAge !== null && postAge >= limitWeeks) {
                    return true;
                }
            }
        }

        // Check for emoji reactions if likes are hidden
        if (settings.hide_likes && hasEmojiReaction(post)) {
            return true;
        }

        // Then check for keyword-based filtering
        const text = post.innerText.toLowerCase();
        return keywords.some(({ key, text: keywordArray }) =>
            settings[key] && keywordArray.some(keyword => text.includes(keyword))
        );
    }

    // Voting System Functions
    function generatePostId(postElement) {
        // Get unique identifiers from the post
        const timestamp = postElement.querySelector('time')?.getAttribute('datetime') || '';
        const authorName = postElement.querySelector('.feed-shared-actor__name')?.innerText || '';
        const contentPreview = postElement.innerText.slice(0, 100).trim();
        
        // Get all images in the post
        const images = Array.from(postElement.querySelectorAll('img')).map(img => img.src).join('|');
        
        // Get the post's unique URL if it exists
        const postUrl = postElement.querySelector('a[href*="/posts/"]')?.href || '';
        
        // Get the post's unique identifier if it exists
        const postId = postElement.querySelector('a[href*="/posts/"]')?.href.split('/posts/')[1]?.split('?')[0] || '';
        
        // Combine multiple identifiers to create a more unique ID
        const uniqueString = `${postId}-${postUrl}-${authorName}-${timestamp}-${images}-${contentPreview}`;
        
        // Create a hash of the string to ensure consistent length
        let hash = 0;
        for (let i = 0; i < uniqueString.length; i++) {
            const char = uniqueString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString(36); // Convert to base36 for shorter but still unique IDs
    }

    function saveVote(postId, vote) {
        chrome.storage.local.get(null, (data) => {
            // Store votes with a prefix to avoid collisions
            const voteKey = `vote_${postId}`;
            chrome.storage.local.set({ [voteKey]: vote });
        });
    }

    function getVote(postId, callback) {
        // Get vote with the prefix
        const voteKey = `vote_${postId}`;
        chrome.storage.local.get([voteKey], (result) => {
            callback(result[voteKey]);
        });
    }

    // Get the chrome extension URL for the GIF
    const poopGifUrl = chrome.runtime.getURL('gifs/mr_hanky.gif');

    // Function to inject poop GIF overlay
    function injectPoopGif(postElement) {
        console.log("Attempting to inject poop GIF for post:", postElement);
        
        // Find the image wrapper container
        const mediaContainer = postElement.querySelector(selectors.mediaWrapper);
        console.log("Found media container:", mediaContainer);
        
        if (!mediaContainer) {
            console.log("No media container found, returning");
            return; // Don't add GIF if no media container exists
        }

        // Check if overlay already exists
        if (mediaContainer.querySelector('.poop-overlay')) {
            console.log("Overlay already exists, returning");
            return;
        }

        // Ensure media container has relative positioning
        if (getComputedStyle(mediaContainer).position === 'static') {
            console.log("Setting relative positioning on media container");
            mediaContainer.style.position = 'relative';
        }

        const overlay = document.createElement('div');
        overlay.className = 'poop-overlay';
        overlay.title = 'Marked as Hot Turd 💩';

        const gif = document.createElement('img');
        gif.className = 'poop-gif';
        gif.src = poopGifUrl;
        gif.alt = 'Hot Turd';

        overlay.appendChild(gif);
        mediaContainer.appendChild(overlay);

        // Trigger reflow before adding visible class for animation
        overlay.offsetHeight;
        overlay.classList.add('visible');
        console.log("Poop GIF overlay added successfully");
    }

    // Function to remove poop GIF overlay
    function removePoopGif(postElement) {
        console.log("Attempting to remove poop GIF for post:", postElement);
        const mediaContainer = postElement.querySelector(selectors.mediaWrapper);
        console.log("Found media container for removal:", mediaContainer);
        
        if (!mediaContainer) {
            console.log("No media container found for removal, returning");
            return;
        }

        const overlay = mediaContainer.querySelector('.poop-overlay');
        if (overlay) {
            console.log("Removing existing overlay");
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 300);
        } else {
            console.log("No overlay found to remove");
        }
    }

    // Update the renderVoteResult function to handle GIF overlay
    function renderVoteResult(container, label, postId) {
        console.log("Rendering vote result:", label, "for post ID:", postId);
        container.innerHTML = `<div class="vote-result" data-post-id="${postId}">You voted: <strong>${label}</strong></div>`;
        
        // Find the parent post element
        const postElement = container.closest(selectors.post);
        console.log("Found parent post element:", postElement);
        
        if (postElement) {
            if (label.includes('Hot Turd')) {
                console.log("Injecting poop GIF for Hot Turd vote");
                injectPoopGif(postElement);
            } else {
                console.log("Removing poop GIF for non-Hot Turd vote");
                removePoopGif(postElement);
            }
        } else {
            console.log("No parent post element found");
        }
    }

    // Update the injectVotingButtons function to check for existing votes and add GIF
    function injectVotingButtons(post) {
        if (post.querySelector(".hot-vote-buttons")) return;

        const postId = generatePostId(post);
        const voteContainer = document.createElement("div");
        voteContainer.className = "hot-vote-buttons";
        voteContainer.dataset.postId = postId;

        const hotTakeBtn = document.createElement("button");
        hotTakeBtn.textContent = "🔥 Hot Take";
        hotTakeBtn.className = "vote-btn hot-take";
        hotTakeBtn.onclick = () => {
            saveVote(postId, "hotTake");
            renderVoteResult(voteContainer, "🔥 Hot Take", postId);
        };

        const hotTurdBtn = document.createElement("button");
        hotTurdBtn.textContent = "💩 Hot Turd";
        hotTurdBtn.className = "vote-btn hot-turd";
        hotTurdBtn.onclick = () => {
            saveVote(postId, "hotTurd");
            renderVoteResult(voteContainer, "💩 Hot Turd", postId);
        };

        getVote(postId, (existingVote) => {
            if (existingVote) {
                renderVoteResult(voteContainer, existingVote === "hotTake" ? "🔥 Hot Take" : "💩 Hot Turd", postId);
            } else {
                voteContainer.appendChild(hotTakeBtn);
                voteContainer.appendChild(hotTurdBtn);
            }
        });

        post.appendChild(voteContainer);
    }

    // Process posts in batches to prevent UI blocking
    function processPosts(posts, startIndex = 0) {
        const BATCH_SIZE = 5;
        const endIndex = Math.min(startIndex + BATCH_SIZE, posts.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const post = posts[i];
            if (!post.classList.contains('processed')) {
                if (shouldRemovePost(post)) {
                    post.classList.add('hidden');
                } else {
                    injectVotingButtons(post);
                }
                post.classList.add('processed');
            }
        }

        if (endIndex < posts.length) {
            requestAnimationFrame(() => {
                processPosts(posts, endIndex);
            });
        }
    }

    // Debounced version of removePosts for better performance
    const debouncedRemovePosts = debounce(() => {
        const posts = document.querySelectorAll(selectors.post + ':not(.processed)');
        if (posts.length > 0) {
            processPosts(Array.from(posts));
        }
    }, 50);

    // Create a mutation observer that processes posts as they're added
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches && node.matches(selectors.post)) {
                        shouldProcess = true;
                    } else if (node.querySelector && node.querySelector(selectors.post)) {
                        shouldProcess = true;
                    }
                }
            });
        });

        if (shouldProcess) {
            debouncedRemovePosts();
        }
    });

    function hideSidebars() {
        selectors.sidebars.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = "none";
            });
        });
    }

    function observeFeed() {
        // Wait for DOM to be ready
        setTimeout(() => {
            const feedContainer = document.querySelector(selectors.feedRoot);
            if (!feedContainer) {
                console.warn("⚠️ Feed container not found. Retrying...");
                return setTimeout(observeFeed, 1500);
            }

            // Initial processing
            debouncedRemovePosts();
            
            // Mark feed as ready and remove loading indicator
            setTimeout(removeLoadingIndicator, 1000);

            observer.observe(feedContainer, { 
                childList: true, 
                subtree: true
            });
            console.log("👀 Observing feed for new posts...");
        }, 1000); // Add initial delay to ensure DOM is ready
    }

    hideSidebars();
    observeFeed();

    // Keep checking for any posts that might have been missed, but less frequently
    setInterval(debouncedRemovePosts, 2000);
});
