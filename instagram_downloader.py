import os
import re
import time
import uuid
import zipfile
import html as html_lib
import requests
import yt_dlp
from datetime import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

# Vercel serverless functions have a read-only filesystem except /tmp
if os.environ.get('VERCEL'):
    DOWNLOAD_FOLDER = "/tmp/downloads"
else:
    DOWNLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "downloads")
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

BOT_USER_AGENTS = [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.21.12.21 A",
    "Twitterbot/1.0",
]

BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def cleanup_old_files(max_age_seconds: int = 7200):
    """Deletes temporary downloaded files older than max_age_seconds (default 2 hours)."""
    now = time.time()
    try:
        for fname in os.listdir(DOWNLOAD_FOLDER):
            fpath = os.path.join(DOWNLOAD_FOLDER, fname)
            if os.path.isfile(fpath) and (now - os.path.getmtime(fpath) > max_age_seconds):
                os.remove(fpath)
    except Exception as e:
        print(f"Error during cleanup: {e}")


def parse_instagram_url(url: str) -> tuple[Optional[str], Optional[str]]:
    """
    Parses an Instagram URL and returns (media_type, shortcode).
    media_type is either 'reel' or 'post' (or 'tv').
    """
    url = url.strip()
    match = re.search(r'instagram\.com/(?:[a-zA-Z0-9_\.]+/)?(reel|reels|p|tv)/([A-Za-z0-9_-]+)', url)
    if match:
        kind = match.group(1).lower()
        shortcode = match.group(2)
        media_type = 'reel' if kind in ('reel', 'reels') else 'post'
        return media_type, shortcode
    return None, None


def download_file_from_url(url: str, output_path: str) -> bool:
    """Downloads a file from a direct media URL using a realistic browser session."""
    headers = {
        'User-Agent': BROWSER_USER_AGENT,
        'Referer': 'https://www.instagram.com/',
        'Accept': '*/*'
    }
    try:
        with requests.get(url, headers=headers, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(output_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
        return os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        print(f"Failed to download media from {url}: {e}")
        return False


def extract_media_via_crawler(shortcode: str) -> Dict[str, Any]:
    """
    Primary High-Reliability Scraper:
    Instagram serves server-side rendered HTML and embedded JSON to social crawlers
    (Facebook, WhatsApp, TwitterBot) for public posts and reels without login barriers.
    """
    result: Dict[str, Any] = {
        'success': False,
        'video_url': None,
        'images': [],
        'caption': '',
        'author': 'Instagram User',
        'thumbnail': ''
    }

    url = f"https://www.instagram.com/p/{shortcode}/"
    headers = {
        'User-Agent': BOT_USER_AGENTS[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }

    try:
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code != 200:
            # Retry with WhatsApp UA if first attempt fails
            headers['User-Agent'] = BOT_USER_AGENTS[1]
            resp = requests.get(url, headers=headers, timeout=12)
            if resp.status_code != 200:
                return result

        html = resp.text

        # 1. Author and Caption from meta tags
        title_match = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html)
        if title_match:
            raw_title = html_lib.unescape(title_match.group(1))
            m = re.match(r'^(.*?)\s+on Instagram:\s*(.*)$', raw_title, re.DOTALL)
            if m:
                result['author'] = m.group(1).strip()
                result['caption'] = m.group(2).strip().strip('"').strip("'")
            else:
                result['author'] = raw_title

        desc_match = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', html)
        if desc_match and not result['caption']:
            result['caption'] = html_lib.unescape(desc_match.group(1)).strip()

        # 2. Thumbnail
        og_img_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
        if og_img_match:
            result['thumbnail'] = html_lib.unescape(og_img_match.group(1))

        # 3. Video URL
        og_vid_match = re.search(r'<meta[^>]+property=["\']og:video["\'][^>]+content=["\']([^"\']+)["\']', html)
        if og_vid_match:
            result['video_url'] = html_lib.unescape(og_vid_match.group(1))

        # 4. Search script tags for carousel images and deep video URLs
        scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
        extracted_images = []

        for sc in scripts:
            # Check for candidate image blocks (full uncompressed resolution)
            if 'candidates' in sc and ('image_versions2' in sc or 'carousel_media' in sc):
                for m in re.finditer(r'"candidates"\s*:\s*\[(.*?)\]', sc):
                    candidates_raw = m.group(1)
                    c_urls = re.findall(r'"url"\s*:\s*"([^"]+)"', candidates_raw)
                    if c_urls:
                        first_url = c_urls[0].replace(r'\/', '/').encode().decode('unicode_escape')
                        # Extract unique media identifier to prevent duplicates
                        base_id_match = re.search(r'/([0-9]+_[0-9]+_[0-9]+_n\.)', first_url)
                        base_id = base_id_match.group(1) if base_id_match else first_url[:60]
                        if not any(base_id in existing for existing in extracted_images):
                            extracted_images.append(first_url)

            # Check for video_url if not already found
            if not result['video_url'] and ('video_url' in sc or 'video_versions' in sc):
                v_matches = re.findall(r'"video_url"\s*:\s*"([^"]+)"', sc)
                if v_matches:
                    clean_v = v_matches[0].replace(r'\/', '/').encode().decode('unicode_escape')
                    result['video_url'] = clean_v

            # Check for display_url fallback
            if 'display_url' in sc and not extracted_images:
                d_matches = re.findall(r'"display_url"\s*:\s*"([^"]+)"', sc)
                for d in d_matches:
                    clean_d = d.replace(r'\/', '/').encode().decode('unicode_escape')
                    if clean_d not in extracted_images:
                        extracted_images.append(clean_d)

        # Fallback to og:image if no candidates were found
        if not extracted_images and result['thumbnail']:
            extracted_images.append(result['thumbnail'])

        result['images'] = extracted_images
        result['success'] = bool(result['images'] or result['video_url'])

    except Exception as e:
        print(f"Crawler extraction error for {shortcode}: {e}")

    return result


def extract_media_from_embed(shortcode: str) -> Dict[str, Any]:
    """
    Fallback scraper: Queries Instagram's public embed frame.
    """
    embed_url = f"https://www.instagram.com/p/{shortcode}/embed/captioned/"
    headers = {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    result: Dict[str, Any] = {'video_url': None, 'images': [], 'caption': '', 'author': 'Instagram User'}
    try:
        resp = requests.get(embed_url, headers=headers, timeout=10)
        if resp.status_code == 200:
            html = resp.text

            author_match = re.search(r'class=["\']EmbeddedMediaHeader["\'][^>]*>.*?class=["\']Username["\'][^>]*>([^<]+)<', html, re.DOTALL)
            if author_match:
                result['author'] = author_match.group(1).strip()

            caption_match = re.search(r'class=["\']Caption["\'][^>]*>(.*?)</div>', html, re.DOTALL)
            if caption_match:
                clean_caption = re.sub(r'<[^>]+>', '', caption_match.group(1)).strip()
                result['caption'] = clean_caption

            video_match = re.search(r'<video[^>]+src=["\']([^"\']+)["\']', html)
            if video_match:
                result['video_url'] = video_match.group(1).replace('&amp;', '&')

            img_matches = re.findall(r'<img[^>]+class=["\']EmbeddedMediaImage["\'][^>]+src=["\']([^"\']+)["\']', html)
            for m in img_matches:
                clean_img = m.replace('&amp;', '&')
                if clean_img not in result['images']:
                    result['images'].append(clean_img)

            script_matches = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
            for sc in script_matches:
                v_urls = re.findall(r'"video_url"\s*:\s*"([^"]+)"', sc)
                for v in v_urls:
                    v_clean = v.encode().decode('unicode_escape').replace(r'\/', '/')
                    if not result['video_url']:
                        result['video_url'] = v_clean

                disp_urls = re.findall(r'"display_url"\s*:\s*"([^"]+)"', sc)
                for d in disp_urls:
                    d_clean = d.encode().decode('unicode_escape').replace(r'\/', '/')
                    if d_clean not in result['images']:
                        result['images'].append(d_clean)
    except Exception as e:
        print(f"Embed scraping error for {shortcode}: {e}")

    return result


def download_reel(url: str) -> Dict[str, Any]:
    """
    Downloads an Instagram Reel without login.
    Uses multi-tier extraction: yt-dlp -> Crawler Scraper -> Embed Scraper.
    """
    cleanup_old_files()
    media_type, shortcode = parse_instagram_url(url)
    if not shortcode:
        return {'success': False, 'error': 'Invalid Instagram URL. Please enter a valid Reel link.'}

    target_id = f"reel_{shortcode}_{uuid.uuid4().hex[:6]}"
    output_filename = f"{target_id}.mp4"
    output_filepath = os.path.join(DOWNLOAD_FOLDER, output_filename)

    # Tier 1: yt-dlp
    ydl_opts = {
        'format': 'best',
        'outtmpl': os.path.join(DOWNLOAD_FOLDER, f"{target_id}.%(ext)s"),
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'http_headers': {
            'User-Agent': BROWSER_USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            clean_url = f"https://www.instagram.com/reel/{shortcode}/"
            info = ydl.extract_info(clean_url, download=True)

            found_file = None
            for ext in ['mp4', 'mkv', 'webm']:
                test_path = os.path.join(DOWNLOAD_FOLDER, f"{target_id}.{ext}")
                if os.path.exists(test_path):
                    found_file = f"{target_id}.{ext}"
                    break

            if found_file:
                uploader = info.get('uploader') or 'Instagram User'
                title = info.get('title') or f"Instagram Reel by @{uploader}"
                date_val = datetime.now().strftime("%b %d, %Y")
                if info.get('upload_date'):
                    try:
                        date_val = datetime.strptime(info['upload_date'], "%Y%m%d").strftime("%b %d, %Y")
                    except Exception:
                        pass

                return {
                    'success': True,
                    'filename': found_file,
                    'title': title,
                    'caption': info.get('description') or title,
                    'uploader': uploader,
                    'author': info.get('uploader_id') or uploader,
                    'date': date_val,
                    'duration': info.get('duration') or 0,
                    'thumbnail': info.get('thumbnail') or '',
                    'shortcode': shortcode,
                    'quality': '1080p Full HD'
                }
    except Exception as e:
        print(f"yt-dlp reel extraction failed for {shortcode}: {e}")

    # Tier 2: Social Crawler Scraper
    crawler_data = extract_media_via_crawler(shortcode)
    if crawler_data.get('video_url'):
        if download_file_from_url(crawler_data['video_url'], output_filepath):
            auth_str = crawler_data.get('author') or 'Instagram User'
            handle = 'instagram_user'
            handle_match = re.search(r'@([a-zA-Z0-9_\.]+)', auth_str)
            if handle_match:
                handle = handle_match.group(1)
            elif '(' in auth_str:
                handle = auth_str.split('(')[-1].strip(' )@')
            else:
                handle = auth_str.split()[0].lower()

            return {
                'success': True,
                'filename': output_filename,
                'title': crawler_data.get('caption') or f"Instagram Reel ({shortcode})",
                'caption': crawler_data.get('caption') or f"Reel by @{handle}",
                'uploader': handle,
                'author': auth_str,
                'date': datetime.now().strftime("%b %d, %Y"),
                'duration': 0,
                'thumbnail': crawler_data.get('thumbnail', ''),
                'shortcode': shortcode,
                'quality': '1080p Full HD'
            }

    # Tier 3: Embed Fallback
    embed_data = extract_media_from_embed(shortcode)
    if embed_data.get('video_url'):
        if download_file_from_url(embed_data['video_url'], output_filepath):
            return {
                'success': True,
                'filename': output_filename,
                'title': embed_data.get('caption') or f"Instagram Reel ({shortcode})",
                'caption': embed_data.get('caption') or 'Instagram Reel',
                'uploader': embed_data.get('author') or 'Instagram User',
                'author': embed_data.get('author') or 'Instagram User',
                'date': datetime.now().strftime("%b %d, %Y"),
                'duration': 0,
                'thumbnail': embed_data.get('images', [''])[0] if embed_data.get('images') else '',
                'shortcode': shortcode,
                'quality': '1080p Full HD'
            }

    return {
        'success': False,
        'error': 'Unable to download this reel. Please verify the link is public and accessible without login.'
    }


def download_post(url: str) -> Dict[str, Any]:
    """
    Downloads an Instagram Post (single photo or carousel) without login.
    Uses multi-tier extraction: Crawler Scraper -> yt-dlp -> Embed Scraper.
    Returns a list of image filenames, metadata, and post ID.
    """
    cleanup_old_files()
    media_type, shortcode = parse_instagram_url(url)
    if not shortcode:
        return {'success': False, 'error': 'Invalid Instagram URL. Please enter a valid Post link.'}

    post_session_id = f"post_{shortcode}_{uuid.uuid4().hex[:6]}"
    images_downloaded: List[Dict[str, str]] = []
    caption = ""
    author = "Instagram User"

    # Tier 1: High-Reliability Crawler Scraper
    crawler_data = extract_media_via_crawler(shortcode)
    if crawler_data.get('caption'):
        caption = crawler_data['caption']
    if crawler_data.get('author'):
        author = crawler_data['author']

    if crawler_data.get('images'):
        for idx, img_url in enumerate(crawler_data['images']):
            img_filename = f"{post_session_id}_img_{idx + 1}.jpg"
            img_path = os.path.join(DOWNLOAD_FOLDER, img_filename)
            if download_file_from_url(img_url, img_path):
                images_downloaded.append({
                    'filename': img_filename,
                    'index': idx + 1
                })

    # Tier 2: yt-dlp fallback
    if not images_downloaded:
        ydl_opts = {
            'outtmpl': os.path.join(DOWNLOAD_FOLDER, f"{post_session_id}_%(autonumber)s.%(ext)s"),
            'quiet': True,
            'no_warnings': True,
            'skip_download': False,
            'http_headers': {
                'User-Agent': BROWSER_USER_AGENT,
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                clean_url = f"https://www.instagram.com/p/{shortcode}/"
                info = ydl.extract_info(clean_url, download=True)
                caption = info.get('title') or caption
                author = info.get('uploader') or author

                for f in os.listdir(DOWNLOAD_FOLDER):
                    if f.startswith(post_session_id) and f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        images_downloaded.append({
                            'filename': f,
                            'index': len(images_downloaded) + 1
                        })

                if not images_downloaded and info.get('thumbnail'):
                    img_filename = f"{post_session_id}_img_1.jpg"
                    img_path = os.path.join(DOWNLOAD_FOLDER, img_filename)
                    if download_file_from_url(info['thumbnail'], img_path):
                        images_downloaded.append({
                            'filename': img_filename,
                            'index': 1
                        })
        except Exception as e:
            print(f"yt-dlp post extraction failed for {shortcode}: {e}")

    # Tier 3: Embed Scraper fallback
    if not images_downloaded:
        embed_data = extract_media_from_embed(shortcode)
        if embed_data.get('caption') and not caption:
            caption = embed_data['caption']
        if embed_data.get('author') and author == 'Instagram User':
            author = embed_data['author']

        if embed_data.get('images'):
            for idx, img_url in enumerate(embed_data['images']):
                img_filename = f"{post_session_id}_img_{idx + 1}.jpg"
                img_path = os.path.join(DOWNLOAD_FOLDER, img_filename)
                if download_file_from_url(img_url, img_path):
                    images_downloaded.append({
                        'filename': img_filename,
                        'index': idx + 1
                    })

    if not images_downloaded:
        return {
            'success': False,
            'error': 'Unable to extract photos from this post. Make sure the post is public and contains photos.'
        }

    handle = 'instagram_user'
    handle_match = re.search(r'@([a-zA-Z0-9_\.]+)', author)
    if handle_match:
        handle = handle_match.group(1)
    elif '(' in author:
        handle = author.split('(')[-1].strip(' )@')
    else:
        handle = author.split()[0].lower() if author else 'user'

    return {
        'success': True,
        'post_id': post_session_id,
        'shortcode': shortcode,
        'author': author,
        'uploader': handle,
        'caption': caption or f"Post by @{handle}",
        'date': datetime.now().strftime("%b %d, %Y"),
        'image_count': len(images_downloaded),
        'images': images_downloaded,
        'quality': 'Original High Resolution'
    }


def create_post_zip(post_id: str) -> Optional[str]:
    """Zips all images belonging to a post_id and returns the zip filename."""
    zip_filename = f"{post_id}_all_photos.zip"
    zip_path = os.path.join(DOWNLOAD_FOLDER, zip_filename)

    matching_files = [
        f for f in os.listdir(DOWNLOAD_FOLDER)
        if f.startswith(post_id) and f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    ]
    if not matching_files:
        return None

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for f in matching_files:
            full_path = os.path.join(DOWNLOAD_FOLDER, f)
            zipf.write(full_path, arcname=f)

    return zip_filename if os.path.exists(zip_path) else None
