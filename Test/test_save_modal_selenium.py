import time
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options


def serve_static(directory, port=8000):
    import os
    os.chdir(directory)
    httpd = HTTPServer(('localhost', port), SimpleHTTPRequestHandler)
    httpd.serve_forever()


def run_test():
    # Start a simple file server serving the repo root so the page can be loaded
    import os
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    server_thread = threading.Thread(target=serve_static, args=(repo_root, 8000), daemon=True)
    server_thread.start()

    opts = Options()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-gpu')

    driver = webdriver.Chrome(options=opts)
    try:
        driver.get('http://localhost:8000/public/index.html')
        time.sleep(0.5)

        # Open settings modal (assumes a button with id settings-btn exists)
        try:
            btn = driver.find_element(By.ID, 'settings-btn')
            btn.click()
        except Exception:
            # If no explicit button, try opening modal via JS
            driver.execute_script("$('#settingsModal').modal('show');")

        time.sleep(0.3)

        # Fill inputs minimally and click Save
        driver.execute_script("$('#kwh_rate_input').val('1.2'); $('#settings_save_btn').click();")

        # Wait for the UI to react (the page uses websockets; this test expects the tmp WebSocket
        # to respond and the code to hide the modal). Wait up to 5s polling.
        hidden = False
        for _ in range(25):
            hidden = driver.execute_script("return $('#settingsModal').is(':visible') === false;")
            if hidden:
                break
            time.sleep(0.2)

        assert hidden, 'Settings modal did not close after save'
        print('PASS: modal closed')
    finally:
        driver.quit()


if __name__ == '__main__':
    run_test()
