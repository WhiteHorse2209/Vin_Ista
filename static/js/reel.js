document.addEventListener('DOMContentLoaded', () => {
    const reelUrlInput = document.getElementById('reelUrl');
    const pasteBtn = document.getElementById('pasteBtn');
    const grabBtn = document.getElementById('grabBtn');
    const loadingState = document.getElementById('loadingState');
    const progressValue = document.getElementById('progressValue');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressStatusLabel = document.getElementById('progressStatusLabel');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const resultCard = document.getElementById('resultCard');
    const authorTag = document.getElementById('authorTag');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoTitle = document.getElementById('videoTitle');
    const durationPill = document.getElementById('durationPill');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Clipboard Paste Helper
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                reelUrlInput.value = text.trim();
                reelUrlInput.focus();
            }
        } catch (err) {
            reelUrlInput.focus();
        }
    });

    // Enter Key Handler
    reelUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            grabBtn.click();
        }
    });

    // Grab Reel with Sliding Percentage Counter
    grabBtn.addEventListener('click', async () => {
        const url = reelUrlInput.value.trim();
        if (!url) {
            showError("Please enter or paste an Instagram Reel URL.");
            return;
        }

        // Reset UI
        errorState.style.display = 'none';
        resultCard.style.display = 'none';
        loadingState.style.display = 'block';
        grabBtn.disabled = true;

        if (progressValue) progressValue.textContent = '0';
        if (progressBarFill) progressBarFill.style.width = '0%';
        if (progressStatusLabel) progressStatusLabel.textContent = 'Connecting to Instagram media stream...';

        // Animate counter up to 90% while fetching
        let animProgress = 0;
        const progressInterval = setInterval(() => {
            if (animProgress < 90) {
                animProgress += Math.floor(Math.random() * 4) + 2;
                if (animProgress > 90) animProgress = 90;
                if (progressValue) progressValue.textContent = animProgress;
                if (progressBarFill) progressBarFill.style.width = `${animProgress}%`;
                
                if (animProgress > 45 && progressStatusLabel) {
                    progressStatusLabel.textContent = 'Extracting high-definition video frames...';
                }
            }
        }, 120);

        try {
            const response = await fetch('/api/download-reel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            clearInterval(progressInterval);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to download reel.');
            }

            // Finish to 100%
            if (progressValue) progressValue.textContent = '100';
            if (progressBarFill) progressBarFill.style.width = '100%';
            if (progressStatusLabel) progressStatusLabel.textContent = 'Extraction complete!';

            await new Promise(r => setTimeout(r, 350));

            // Success: Populate Video & Metadata
            const filename = data.filename;
            const previewUrl = `/preview/${encodeURIComponent(filename)}`;
            const downloadUrl = `/download/${encodeURIComponent(filename)}`;

            authorTag.textContent = data.uploader ? `@${data.uploader}` : '@instagram_user';
            videoTitle.textContent = data.title || `Instagram Reel (${data.shortcode})`;
            
            if (data.duration && data.duration > 0) {
                const mins = Math.floor(data.duration / 60);
                const secs = Math.floor(data.duration % 60);
                durationPill.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                durationPill.style.display = 'inline-block';
            } else {
                durationPill.style.display = 'none';
            }

            videoPlayer.src = previewUrl;
            videoPlayer.load();

            downloadBtn.href = downloadUrl;
            downloadBtn.setAttribute('download', `${data.shortcode || 'reel'}.mp4`);

            loadingState.style.display = 'none';
            resultCard.style.display = 'block';

            // Auto-scroll to result
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
            clearInterval(progressInterval);
            loadingState.style.display = 'none';
            showError(err.message || 'Error communicating with downloader server.');
        } finally {
            grabBtn.disabled = false;
        }
    });

    // Reset Handler
    resetBtn.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        resultCard.style.display = 'none';
        errorState.style.display = 'none';
        reelUrlInput.value = '';
        reelUrlInput.focus();
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorState.style.display = 'flex';
        resultCard.style.display = 'none';
    }
});
