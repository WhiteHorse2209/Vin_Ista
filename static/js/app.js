/**
 * VINISTA — SEAMLESS PAGE SHIFTING, APPLE DOCK MAGNIFICATION & METADATA CONTROLLER
 */

// 1. Unified Router (Driven solely by Apple Dock)
function switchView(targetView, updateUrl = true) {
    const panels = document.querySelectorAll('.view-panel');
    const dockButtons = document.querySelectorAll('.dock-item');
    const body = document.body;

    // Reset active classes
    panels.forEach(p => p.classList.remove('active'));
    dockButtons.forEach(d => d.classList.remove('active'));

    // Reset body theme classes
    body.classList.remove('theme-intro', 'theme-reel', 'theme-post');

    if (targetView === 'reel') {
        const reelPanel = document.getElementById('viewReel');
        if (reelPanel) reelPanel.classList.add('active');
        
        const dockReel = document.getElementById('dockReel');
        if (dockReel) dockReel.classList.add('active');
        
        body.classList.add('theme-reel');
        if (updateUrl) history.pushState({ view: 'reel' }, '', '/reel');
    } else if (targetView === 'post') {
        const postPanel = document.getElementById('viewPost');
        if (postPanel) postPanel.classList.add('active');
        
        const dockPost = document.getElementById('dockPost');
        if (dockPost) dockPost.classList.add('active');
        
        body.classList.add('theme-post');
        if (updateUrl) history.pushState({ view: 'post' }, '', '/post');
    } else {
        // default: intro
        const introPanel = document.getElementById('viewIntro');
        if (introPanel) introPanel.classList.add('active');
        
        const dockIntro = document.getElementById('dockIntro');
        if (dockIntro) dockIntro.classList.add('active');
        
        body.classList.add('theme-intro');
        if (updateUrl) history.pushState({ view: 'intro' }, '', '/');
    }
}

// Browser Back/Forward navigation
window.addEventListener('popstate', (e) => {
    const path = window.location.pathname;
    if (path.includes('/reel')) {
        switchView('reel', false);
    } else if (path.includes('/post')) {
        switchView('post', false);
    } else {
        switchView('intro', false);
    }
});

// 2. Apple Dock Magnification Physics (Compact, Subtle, Elegant)
function initAppleDockMagnification() {
    const dock = document.getElementById('appleDock');
    if (!dock) return;

    const items = dock.querySelectorAll('.dock-item');
    const maxDistance = 75;  // Compact influence zone
    const maxScale = 1.18;   // Subtle elegant lift

    const isHoverable = window.matchMedia('(hover: hover)').matches;
    if (!isHoverable) return;

    dock.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX;

        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const itemCenterX = rect.left + rect.width / 2;
            const distance = Math.abs(mouseX - itemCenterX);

            if (distance < maxDistance) {
                const factor = 1 - (distance / maxDistance);
                const scale = 1 + (maxScale - 1) * Math.sin((factor * Math.PI) / 2);
                item.style.transform = `scale(${scale}) translateY(-${(scale - 1) * 8}px)`;
            } else {
                item.style.transform = 'scale(1) translateY(0)';
            }
        });
    });

    dock.addEventListener('mouseleave', () => {
        items.forEach(item => {
            item.style.transform = 'scale(1) translateY(0)';
        });
    });
}

// 3. Live Digital Clock (HH:MM:SS)
function initLiveClock() {
    const hoursEl = document.getElementById('clockHours');
    const minutesEl = document.getElementById('clockMinutes');
    const secondsEl = document.getElementById('clockSeconds');

    if (!hoursEl || !minutesEl || !secondsEl) return;

    function update() {
        const now = new Date();
        hoursEl.textContent = String(now.getHours()).padStart(2, '0');
        minutesEl.textContent = String(now.getMinutes()).padStart(2, '0');
        secondsEl.textContent = String(now.getSeconds()).padStart(2, '0');
    }
    update();
    setInterval(update, 1000);
}

// 4. Custom Filename Generator: SJ_{accountname}_{reelname}_{downloaded_time}
function getDownloadTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function sanitizeForFilename(str, maxLen = 30) {
    if (!str) return 'media';
    return str
        .replace(/@/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, maxLen) || 'media';
}

// 5. Reels Downloader Controller (Large Autoplay Reel Aside + Clean Metadata Aside + Custom Download Naming)
function initReelController() {
    const reelUrlInput = document.getElementById('reelUrl');
    const pasteBtn = document.getElementById('pasteBtn');
    const grabBtn = document.getElementById('grabBtn');
    const loadingState = document.getElementById('reelLoading');
    const progressValue = document.getElementById('reelProgressVal');
    const progressBarFill = document.getElementById('reelProgressFill');
    const progressStatusLabel = document.getElementById('reelProgressStatus');
    const errorBox = document.getElementById('reelError');
    const resultCard = document.getElementById('reelResult');
    
    // Metadata fields
    const videoPlayer = document.getElementById('videoPlayer');
    const authorName = document.getElementById('authorName');
    const authorHandle = document.getElementById('authorHandle');
    const accountAvatarLetter = document.getElementById('accountAvatarLetter');
    const reelDateVal = document.getElementById('reelDateVal');
    const videoCaption = document.getElementById('videoCaption');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (!grabBtn) return;

    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) reelUrlInput.value = text.trim();
            } catch (e) {
                reelUrlInput.focus();
            }
        });
    }

    reelUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') grabBtn.click();
    });

    grabBtn.addEventListener('click', async () => {
        const url = reelUrlInput.value.trim();
        if (!url) {
            showReelError("Please enter an Instagram Reel URL.");
            return;
        }

        errorBox.style.display = 'none';
        resultCard.style.display = 'none';
        loadingState.style.display = 'block';
        grabBtn.disabled = true;

        if (progressValue) progressValue.textContent = '0';
        if (progressBarFill) progressBarFill.style.width = '0%';
        if (progressStatusLabel) progressStatusLabel.textContent = 'Connecting to Instagram...';

        let p = 0;
        const interval = setInterval(() => {
            if (p < 90) {
                p += Math.floor(Math.random() * 6) + 3;
                if (p > 90) p = 90;
                if (progressValue) progressValue.textContent = p;
                if (progressBarFill) progressBarFill.style.width = `${p}%`;

                if (p < 30) {
                    if (progressStatusLabel) progressStatusLabel.textContent = 'Connecting to Instagram server...';
                } else if (p < 70) {
                    if (progressStatusLabel) progressStatusLabel.textContent = 'Extracting video stream...';
                } else {
                    if (progressStatusLabel) progressStatusLabel.textContent = 'Processing 1080p MP4 asset...';
                }
            }
        }, 110);

        try {
            const resp = await fetch('/api/download-reel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const data = await resp.json();
            clearInterval(interval);

            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Failed to download reel.');
            }

            if (progressValue) progressValue.textContent = '100';
            if (progressBarFill) progressBarFill.style.width = '100%';
            if (progressStatusLabel) progressStatusLabel.textContent = 'Extraction complete!';
            await new Promise(r => setTimeout(r, 220));

            const filename = data.filename;
            const previewUrl = `/preview/${encodeURIComponent(filename)}`;
            
            // Set video source and automatically play in larger frame
            videoPlayer.src = previewUrl;
            videoPlayer.load();
            videoPlayer.muted = true; // Required by browsers for immediate autoplay
            videoPlayer.play().catch(e => console.log('Autoplay handled:', e));

            // Populate clean metadata aside
            const uploaderHandle = data.uploader || 'user';
            const displayName = data.author || data.uploader || 'Instagram Creator';
            
            authorName.textContent = displayName;
            authorHandle.textContent = `@${uploaderHandle.replace(/^@/, '')}`;
            accountAvatarLetter.textContent = (uploaderHandle[0] || 'I').toUpperCase();
            reelDateVal.textContent = data.date || 'Recent';
            if (videoCaption) videoCaption.textContent = data.caption || data.title || 'Instagram Reel Video';

            // Generate exact custom download filename: SJ_accountname_reelname_downloaded_time.mp4
            const accClean = sanitizeForFilename(uploaderHandle);
            const reelClean = sanitizeForFilename(data.title || data.shortcode || 'reel');
            const timeClean = getDownloadTimestamp();
            const customReelFilename = `SJ_${accClean}_${reelClean}_${timeClean}.mp4`;

            downloadBtn.href = `/download/${encodeURIComponent(filename)}?name=${encodeURIComponent(customReelFilename)}`;
            downloadBtn.setAttribute('download', customReelFilename);

            loadingState.style.display = 'none';
            resultCard.style.display = 'flex';
        } catch (err) {
            clearInterval(interval);
            loadingState.style.display = 'none';
            showReelError(err.message || 'Error fetching reel.');
        } finally {
            grabBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        resultCard.style.display = 'none';
        errorBox.style.display = 'none';
        reelUrlInput.value = '';
        reelUrlInput.focus();
    });

    function showReelError(msg) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
    }
}

// 6. Posts Controller (Featured Photo Aside + Clean Metadata Aside + PDF Down + New Search)
function initPostController() {
    const postUrlInput = document.getElementById('postUrl');
    const pastePostBtn = document.getElementById('pastePostBtn');
    const fetchPostBtn = document.getElementById('fetchPostBtn');
    const postLoading = document.getElementById('postLoading');
    const postProgressVal = document.getElementById('postProgressVal');
    const postProgressFill = document.getElementById('postProgressFill');
    const postProgressLabel = document.getElementById('postProgressLabel');
    const postError = document.getElementById('postError');
    const postResults = document.getElementById('postResults');

    // Metadata fields
    const featuredPostImg = document.getElementById('featuredPostImg');
    const featuredCounterBadge = document.getElementById('featuredCounterBadge');
    const postAuthorName = document.getElementById('postAuthorName');
    const postAuthorHandle = document.getElementById('postAuthorHandle');
    const postAvatarLetter = document.getElementById('postAvatarLetter');
    const postDateVal = document.getElementById('postDateVal');
    const postCountVal = document.getElementById('postCountVal');
    const postCaption = document.getElementById('postCaption');
    const galleryCountTag = document.getElementById('galleryCountTag');
    const photosGrid = document.getElementById('photosGrid');
    const makePdfBtn = document.getElementById('makePdfBtn');
    const makeZipBtn = document.getElementById('makeZipBtn');
    const resetPostBtn = document.getElementById('resetPostBtn');
    const pdfStatusMsg = document.getElementById('pdfStatusMsg');

    let currentPostId = null;
    let currentPostData = null;

    if (!fetchPostBtn) return;

    if (pastePostBtn) {
        pastePostBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) postUrlInput.value = text.trim();
            } catch (e) {
                postUrlInput.focus();
            }
        });
    }

    postUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchPostBtn.click();
    });

    fetchPostBtn.addEventListener('click', async () => {
        const url = postUrlInput.value.trim();
        if (!url) {
            showPostError("Please enter an Instagram Post URL.");
            return;
        }

        postError.style.display = 'none';
        postResults.style.display = 'none';
        postLoading.style.display = 'block';
        pdfStatusMsg.style.display = 'none';
        fetchPostBtn.disabled = true;

        if (postProgressVal) postProgressVal.textContent = '0';
        if (postProgressFill) postProgressFill.style.width = '0%';
        if (postProgressLabel) postProgressLabel.textContent = 'Connecting to Instagram...';

        let p = 0;
        const interval = setInterval(() => {
            if (p < 90) {
                p += Math.floor(Math.random() * 6) + 3;
                if (p > 90) p = 90;
                if (postProgressVal) postProgressVal.textContent = p;
                if (postProgressFill) postProgressFill.style.width = `${p}%`;

                if (p < 30) {
                    if (postProgressLabel) postProgressLabel.textContent = 'Connecting to Instagram server...';
                } else if (p < 70) {
                    if (postProgressLabel) postProgressLabel.textContent = 'Extracting uncompressed photos...';
                } else {
                    if (postProgressLabel) postProgressLabel.textContent = 'Preparing full-resolution assets...';
                }
            }
        }, 110);

        try {
            const resp = await fetch('/api/download-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const data = await resp.json();
            clearInterval(interval);

            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Failed to download post photos.');
            }

            if (postProgressVal) postProgressVal.textContent = '100';
            if (postProgressFill) postProgressFill.style.width = '100%';
            if (postProgressLabel) postProgressLabel.textContent = 'Photos extracted successfully!';
            await new Promise(r => setTimeout(r, 220));

            currentPostId = data.post_id;
            currentPostData = data;
            const count = data.image_count || data.images.length;

            // Populate Clean Metadata Aside
            const uploaderHandle = data.uploader || 'user';
            const displayName = data.author || data.uploader || 'Instagram User';

            postAuthorName.textContent = displayName;
            postAuthorHandle.textContent = `@${uploaderHandle.replace(/^@/, '')}`;
            postAvatarLetter.textContent = (uploaderHandle[0] || 'P').toUpperCase();
            postDateVal.textContent = data.date || 'Recent';
            postCountVal.textContent = `${count} ${count === 1 ? 'Photo' : 'Photos'}`;
            if (postCaption) postCaption.textContent = data.caption || 'Instagram Post';
            galleryCountTag.textContent = `${count} Photos`;

            // Set Featured Preview Photo Aside
            if (data.images && data.images.length > 0) {
                featuredPostImg.src = `/preview/${encodeURIComponent(data.images[0].filename)}`;
                featuredCounterBadge.textContent = `Photo 1 of ${count}`;
            }

            // Populate Photos Grid Drawer with custom named save buttons
            photosGrid.innerHTML = '';
            data.images.forEach((img, idx) => {
                const item = document.createElement('div');
                item.className = 'photo-item';
                const previewUrl = `/preview/${encodeURIComponent(img.filename)}`;
                
                // Individual photo filename: SJ_accountname_postname_photoX_time.jpg
                const accClean = sanitizeForFilename(uploaderHandle);
                const postClean = sanitizeForFilename(data.shortcode || 'post');
                const timeClean = getDownloadTimestamp();
                const customPhotoName = `SJ_${accClean}_${postClean}_photo${img.index}_${timeClean}.jpg`;
                const downloadUrl = `/download/${encodeURIComponent(img.filename)}?name=${encodeURIComponent(customPhotoName)}`;
                
                item.innerHTML = `
                    <img src="${previewUrl}" alt="Photo ${img.index}">
                    <a href="${downloadUrl}" download="${customPhotoName}">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                        <span>Save</span>
                    </a>
                `;

                // Clicking photo item swaps featured preview photo aside
                item.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'A') {
                        featuredPostImg.src = previewUrl;
                        featuredCounterBadge.textContent = `Photo ${img.index} of ${count}`;
                    }
                });

                photosGrid.appendChild(item);
            });

            postLoading.style.display = 'none';
            postResults.style.display = 'flex';
        } catch (err) {
            clearInterval(interval);
            postLoading.style.display = 'none';
            showPostError(err.message || 'Error fetching post.');
        } finally {
            fetchPostBtn.disabled = false;
        }
    });

    // Compile & Download PDF with custom filename: SJ_accountname_postname_time.pdf
    makePdfBtn.addEventListener('click', async () => {
        if (!currentPostId) return;
        makePdfBtn.disabled = true;
        pdfStatusMsg.style.display = 'block';
        pdfStatusMsg.textContent = 'Compiling photos into PDF document...';

        try {
            const resp = await fetch('/api/make-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: currentPostId })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to generate PDF.');

            pdfStatusMsg.textContent = 'PDF ready! Starting download...';
            
            // Format: SJ_accountname_postname_downloaded_time.pdf
            const uploaderHandle = (currentPostData && currentPostData.uploader) || 'account';
            const shortcode = (currentPostData && currentPostData.shortcode) || 'post';
            const accClean = sanitizeForFilename(uploaderHandle);
            const postClean = sanitizeForFilename(shortcode);
            const timeClean = getDownloadTimestamp();
            const customPdfName = `SJ_${accClean}_${postClean}_${timeClean}.pdf`;

            const link = document.createElement('a');
            link.href = `/download/${encodeURIComponent(data.pdf_filename)}?name=${encodeURIComponent(customPdfName)}`;
            link.setAttribute('download', customPdfName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                pdfStatusMsg.textContent = 'PDF downloaded successfully!';
            }, 1200);
        } catch (e) {
            pdfStatusMsg.textContent = `Error: ${e.message}`;
        } finally {
            makePdfBtn.disabled = false;
        }
    });

    // Save ZIP with custom filename: SJ_accountname_postname_time.zip
    makeZipBtn.addEventListener('click', async () => {
        if (!currentPostId) return;
        makeZipBtn.disabled = true;
        pdfStatusMsg.style.display = 'block';
        pdfStatusMsg.textContent = 'Archiving ZIP...';

        try {
            const resp = await fetch('/api/make-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: currentPostId })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to create ZIP.');

            const uploaderHandle = (currentPostData && currentPostData.uploader) || 'account';
            const shortcode = (currentPostData && currentPostData.shortcode) || 'post';
            const accClean = sanitizeForFilename(uploaderHandle);
            const postClean = sanitizeForFilename(shortcode);
            const timeClean = getDownloadTimestamp();
            const customZipName = `SJ_${accClean}_${postClean}_${timeClean}.zip`;

            const link = document.createElement('a');
            link.href = `/download/${encodeURIComponent(data.zip_filename)}?name=${encodeURIComponent(customZipName)}`;
            link.setAttribute('download', customZipName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                pdfStatusMsg.textContent = 'ZIP downloaded successfully!';
            }, 1200);
        } catch (e) {
            pdfStatusMsg.textContent = `Error: ${e.message}`;
        } finally {
            makeZipBtn.disabled = false;
        }
    });

    // New Search for Posts (as requested by user)
    if (resetPostBtn) {
        resetPostBtn.addEventListener('click', () => {
            postResults.style.display = 'none';
            postError.style.display = 'none';
            postUrlInput.value = '';
            currentPostId = null;
            currentPostData = null;
            postUrlInput.focus();
        });
    }

    function showPostError(msg) {
        postError.textContent = msg;
        postError.style.display = 'block';
    }
}

// 7. Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    initLiveClock();
    initAppleDockMagnification();
    initReelController();
    initPostController();

    // Check initial route to set correct active view and theme
    const path = window.location.pathname;
    if (path.includes('/reel')) {
        switchView('reel', false);
    } else if (path.includes('/post')) {
        switchView('post', false);
    } else {
        switchView('intro', false);
    }

    // Attach Apple Dock buttons (Sole Navigation Controller)
    const dockIntro = document.getElementById('dockIntro');
    const dockReel = document.getElementById('dockReel');
    const dockPost = document.getElementById('dockPost');

    if (dockIntro) dockIntro.addEventListener('click', () => switchView('intro'));
    if (dockReel) dockReel.addEventListener('click', () => switchView('reel'));
    if (dockPost) dockPost.addEventListener('click', () => switchView('post'));

    // Quick shifting buttons on Intro view
    const shiftToReels = document.getElementById('shiftToReels');
    const shiftToPosts = document.getElementById('shiftToPosts');
    if (shiftToReels) shiftToReels.addEventListener('click', (e) => { e.preventDefault(); switchView('reel'); });
    if (shiftToPosts) shiftToPosts.addEventListener('click', (e) => { e.preventDefault(); switchView('post'); });
});
