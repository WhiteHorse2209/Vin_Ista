import os
from flask import Flask, render_template, request, jsonify, send_from_directory, abort
from instagram_downloader import (
    download_reel,
    download_post,
    create_post_zip,
    DOWNLOAD_FOLDER
)
from pdf_generator import convert_images_to_pdf

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB max request size

@app.route('/')
def intro():
    """Intro View: Styled with Black background and Beige text."""
    return render_template('index.html')

@app.route('/reel')
def reel_page():
    """Reel Downloader: Styled with Retro Violet (#190133), Flame (#FF4500) and Pale Yellow (#FFF3B0)."""
    return render_template('index.html')

@app.route('/post')
def post_page():
    """Post Downloader & PDF Studio: Styled with Royal Blue (#014BAA) and Light Cream (#F8F3F0)."""
    return render_template('index.html')

@app.route('/api/download-reel', methods=['POST'])
def api_download_reel():
    data = request.get_json(silent=True) or {}
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'success': False, 'error': 'Please provide an Instagram Reel link.'}), 400

    result = download_reel(url)
    if not result.get('success'):
        return jsonify(result), 400

    return jsonify(result)

@app.route('/api/download-post', methods=['POST'])
def api_download_post():
    data = request.get_json(silent=True) or {}
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'success': False, 'error': 'Please provide an Instagram Post link.'}), 400

    result = download_post(url)
    if not result.get('success'):
        return jsonify(result), 400

    return jsonify(result)

@app.route('/api/make-pdf', methods=['POST'])
def api_make_pdf():
    data = request.get_json(silent=True) or {}
    post_id = data.get('post_id', '').strip()
    if not post_id:
        return jsonify({'success': False, 'error': 'Invalid post identifier.'}), 400

    # Locate all image files belonging to post_id
    matching_images = [
        os.path.join(DOWNLOAD_FOLDER, f)
        for f in sorted(os.listdir(DOWNLOAD_FOLDER))
        if f.startswith(post_id) and f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    ]

    if not matching_images:
        return jsonify({'success': False, 'error': 'No downloaded photos found for this post session.'}), 404

    pdf_filename = f"{post_id}_document.pdf"
    pdf_path = os.path.join(DOWNLOAD_FOLDER, pdf_filename)

    try:
        convert_images_to_pdf(matching_images, pdf_path)
        return jsonify({
            'success': True,
            'pdf_filename': pdf_filename,
            'image_count': len(matching_images)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to generate PDF: {str(e)}'}), 500

@app.route('/api/make-zip', methods=['POST'])
def api_make_zip():
    data = request.get_json(silent=True) or {}
    post_id = data.get('post_id', '').strip()
    if not post_id:
        return jsonify({'success': False, 'error': 'Invalid post identifier.'}), 400

    zip_filename = create_post_zip(post_id)
    if not zip_filename:
        return jsonify({'success': False, 'error': 'Failed to create ZIP file.'}), 500

    return jsonify({'success': True, 'zip_filename': zip_filename})

@app.route('/download/<path:filename>')
def download_file(filename):
    """Triggers direct attachment download for the user with optional custom filename."""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(DOWNLOAD_FOLDER, safe_name)
    if not os.path.exists(file_path):
        abort(404)
    custom_name = request.args.get('name')
    download_name = os.path.basename(custom_name) if custom_name else safe_name
    return send_from_directory(DOWNLOAD_FOLDER, safe_name, as_attachment=True, download_name=download_name)

@app.route('/preview/<path:filename>')
def preview_file(filename):
    """Serves media inline for preview in video tags or img tags."""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(DOWNLOAD_FOLDER, safe_name)
    if not os.path.exists(file_path):
        abort(404)
    return send_from_directory(DOWNLOAD_FOLDER, safe_name, as_attachment=False)

if __name__ == '__main__':
    print("=" * 60)
    print(" VINISTA - INSTAGRAM REEL & POST DOWNLOADER + PDF MAKER")
    print(" Virtual Environment Active: YES")
    print(" Running locally on http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, host='127.0.0.1', port=5000)

