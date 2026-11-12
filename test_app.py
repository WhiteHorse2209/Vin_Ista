import os
import unittest
from app import app
from PIL import Image
from instagram_downloader import DOWNLOAD_FOLDER

class VinistaAppTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_intro_page(self):
        """Test intro page loads with Midnight Black background, Pure White and Gold accents."""
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        html = res.data.decode('utf-8')
        self.assertIn("VINISTA", html)
        self.assertIn("Reels", html)
        self.assertIn("Posts", html)
        self.assertIn("apple-dock", html)

    def test_reel_page(self):
        """Test reel route loads with clean typography and compact layout."""
        res = self.client.get('/reel')
        self.assertEqual(res.status_code, 200)
        html = res.data.decode('utf-8')
        self.assertIn("Reels", html)
        self.assertIn("btn-grab-reel", html)

    def test_post_page(self):
        """Test post route loads with PDF prompt and clean layout."""
        res = self.client.get('/post')
        self.assertEqual(res.status_code, 200)
        html = res.data.decode('utf-8')
        self.assertIn("Posts", html)
        self.assertIn("Download PDF", html)

    def test_api_invalid_inputs(self):
        """Test API handles empty and invalid payloads cleanly."""
        res = self.client.post('/api/download-reel', json={'url': ''})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json['success'])

        res = self.client.post('/api/download-post', json={'url': ''})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json['success'])

    def test_url_parser(self):
        """Test URL parser handles clean and query-param populated Instagram URLs."""
        from instagram_downloader import parse_instagram_url
        kind, code = parse_instagram_url("https://www.instagram.com/p/DfnIJIlE-wp/?utm_source=ig_web_copy_link&xtok=NTc4MTIwNjQ2YQ==")
        self.assertEqual(kind, 'post')
        self.assertEqual(code, 'DfnIJIlE-wp')

        kind2, code2 = parse_instagram_url("https://www.instagram.com/reel/C8_1234abcd/?igsh=abcdef")
        self.assertEqual(kind2, 'reel')
        self.assertEqual(code2, 'C8_1234abcd')

    def test_pdf_generation_flow(self):
        """Test PDF generation endpoint with sample images."""
        test_post_id = "post_testmock_12345"
        os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
        img1_path = os.path.join(DOWNLOAD_FOLDER, f"{test_post_id}_1.jpg")
        img2_path = os.path.join(DOWNLOAD_FOLDER, f"{test_post_id}_2.jpg")

        im1 = Image.new('RGB', (300, 300), color=(1, 75, 170))
        im2 = Image.new('RGB', (300, 300), color=(248, 243, 240))
        im1.save(img1_path)
        im2.save(img2_path)

        res = self.client.post('/api/make-pdf', json={'post_id': test_post_id})
        self.assertEqual(res.status_code, 200)
        data = res.json
        self.assertTrue(data['success'])
        pdf_name = data['pdf_filename']

        # Verify PDF download endpoint
        pdf_res = self.client.get(f'/download/{pdf_name}')
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.content_type, 'application/pdf')
        pdf_res.close()

        # Clean up test mock files
        for p in [img1_path, img2_path, os.path.join(DOWNLOAD_FOLDER, pdf_name)]:
            if os.path.exists(p):
                os.remove(p)

    def test_custom_download_filename(self):
        """Test download endpoint attaches the required custom SJ_ naming header."""
        test_file = os.path.join(DOWNLOAD_FOLDER, 'dummy_test_dl.mp4')
        with open(test_file, 'wb') as f:
            f.write(b'sample')

        custom_name = 'SJ_webdhundo_reel1_20261112_102030.mp4'
        res = self.client.get(f'/download/dummy_test_dl.mp4?name={custom_name}')
        self.assertEqual(res.status_code, 200)
        cd = res.headers.get('Content-Disposition')
        self.assertIn(custom_name, cd)
        res.close()

        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == '__main__':
    unittest.main()
