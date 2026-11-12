document.addEventListener('DOMContentLoaded', () => {
    const postUrlInput = document.getElementById('postUrl');
    const pastePostBtn = document.getElementById('pastePostBtn');
    const fetchPostBtn = document.getElementById('fetchPostBtn');
    const postLoading = document.getElementById('postLoading');
    const postProgressValue = document.getElementById('postProgressValue');
    const postProgressBarFill = document.getElementById('postProgressBarFill');
    const postProgressLabel = document.getElementById('postProgressLabel');
    const postError = document.getElementById('postError');
    const postErrorMessage = document.getElementById('postErrorMessage');
    const postResults = document.getElementById('postResults');
    const postAuthorTag = document.getElementById('postAuthorTag');
    const photoCountBadge = document.getElementById('photoCountBadge');
    const postCaption = document.getElementById('postCaption');
    const photosGrid = document.getElementById('photosGrid');
    const makePdfBtn = document.getElementById('makePdfBtn');
    const makeZipBtn = document.getElementById('makeZipBtn');
    const pdfStatusMsg = document.getElementById('pdfStatusMsg');
    const resetPostBtn = document.getElementById('resetPostBtn');

    let currentPostId = null;

    // Paste from clipboard
    pastePostBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                postUrlInput.value = text.trim();
                postUrlInput.focus();
            }
        } catch (err) {
            postUrlInput.focus();
        }
    });

    // Enter key handler
    postUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchPostBtn.click();
        }
    });

    // Fetch Post Photos with Sliding Percentage Counter
    fetchPostBtn.addEventListener('click', async () => {
        const url = postUrlInput.value.trim();
        if (!url) {
            showError("Please enter or paste an Instagram Post URL.");
            return;
        }

        // Reset UI
        postError.style.display = 'none';
        postResults.style.display = 'none';
        postLoading.style.display = 'block';
        pdfStatusMsg.style.display = 'none';
        fetchPostBtn.disabled = true;

        if (postProgressValue) postProgressValue.textContent = '0';
        if (postProgressBarFill) postProgressBarFill.style.width = '0%';
        if (postProgressLabel) postProgressLabel.textContent = 'Querying Instagram post and carousel metadata...';

        // Animate counter up to 90% while fetching
        let animProgress = 0;
        const progressInterval = setInterval(() => {
            if (animProgress < 90) {
                animProgress += Math.floor(Math.random() * 4) + 2;
                if (animProgress > 90) animProgress = 90;
                if (postProgressValue) postProgressValue.textContent = animProgress;
                if (postProgressBarFill) postProgressBarFill.style.width = `${animProgress}%`;
                
                if (animProgress > 50 && postProgressLabel) {
                    postProgressLabel.textContent = 'Downloading uncompressed high-resolution photos...';
                }
            }
        }, 120);

        try {
            const response = await fetch('/api/download-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            clearInterval(progressInterval);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to download post photos.');
            }

            // Finish to 100%
            if (postProgressValue) postProgressValue.textContent = '100';
            if (postProgressBarFill) postProgressBarFill.style.width = '100%';
            if (postProgressLabel) postProgressLabel.textContent = 'Photos extracted successfully!';

            await new Promise(r => setTimeout(r, 350));

            currentPostId = data.post_id;

            // Populate Metadata
            postAuthorTag.textContent = data.author ? `@${data.author}` : '@instagram_user';
            const count = data.image_count || data.images.length;
            photoCountBadge.textContent = `${count} ${count === 1 ? 'Photo' : 'Photos'}`;

            if (data.caption) {
                postCaption.textContent = data.caption;
                postCaption.style.display = 'block';
            } else {
                postCaption.style.display = 'none';
            }

            // Populate Photos Grid (Clean SVG icon, no emojis)
            photosGrid.innerHTML = '';
            data.images.forEach((img) => {
                const card = document.createElement('div');
                card.className = 'photo-card spotlight-card';

                const previewUrl = `/preview/${encodeURIComponent(img.filename)}`;
                const downloadUrl = `/download/${encodeURIComponent(img.filename)}`;

                card.innerHTML = `
                    <div class="photo-img-wrapper">
                        <img src="${previewUrl}" alt="Photo ${img.index}" loading="lazy">
                        <span class="photo-badge">Photo ${img.index}</span>
                    </div>
                    <div class="photo-card-footer">
                        <a href="${downloadUrl}" class="btn-photo-download" download="post_photo_${img.index}.jpg">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                            <span>Download Photo</span>
                        </a>
                    </div>
                `;
                photosGrid.appendChild(card);
            });

            postLoading.style.display = 'none';
            postResults.style.display = 'block';
            postResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
            clearInterval(progressInterval);
            postLoading.style.display = 'none';
            showError(err.message || 'Error communicating with server.');
        } finally {
            fetchPostBtn.disabled = false;
        }
    });

    // Make PDF Handler with percentage feedback
    makePdfBtn.addEventListener('click', async () => {
        if (!currentPostId) return;

        makePdfBtn.disabled = true;
        pdfStatusMsg.style.display = 'block';
        pdfStatusMsg.textContent = 'Compiling photos into print-ready PDF document...';

        try {
            const response = await fetch('/api/make-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ post_id: currentPostId })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to generate PDF.');
            }

            pdfStatusMsg.textContent = 'PDF generated successfully! Starting download...';

            // Trigger file download
            const downloadUrl = `/download/${encodeURIComponent(data.pdf_filename)}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `instagram_post_${currentPostId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                pdfStatusMsg.textContent = 'PDF downloaded.';
            }, 1800);
        } catch (err) {
            pdfStatusMsg.textContent = `Error: ${err.message}`;
        } finally {
            makePdfBtn.disabled = false;
        }
    });

    // Make ZIP Handler
    makeZipBtn.addEventListener('click', async () => {
        if (!currentPostId) return;

        makeZipBtn.disabled = true;
        pdfStatusMsg.style.display = 'block';
        pdfStatusMsg.textContent = 'Archiving all photos into compressed ZIP...';

        try {
            const response = await fetch('/api/make-zip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ post_id: currentPostId })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create ZIP.');
            }

            pdfStatusMsg.textContent = 'Archive ready! Starting download...';

            const downloadUrl = `/download/${encodeURIComponent(data.zip_filename)}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `all_post_photos.zip`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            pdfStatusMsg.textContent = `Error: ${err.message}`;
        } finally {
            makeZipBtn.disabled = false;
        }
    });

    // Reset Handler
    resetPostBtn.addEventListener('click', () => {
        postResults.style.display = 'none';
        postError.style.display = 'none';
        postUrlInput.value = '';
        currentPostId = null;
        postUrlInput.focus();
    });

    function showError(msg) {
        postErrorMessage.textContent = msg;
        postError.style.display = 'flex';
        postResults.style.display = 'none';
    }
});
