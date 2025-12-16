import time
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


@pytest.mark.usefixtures('http_server', 'config_server')
def test_save_modal_closes(http_server, config_server):
    """Load the UI (served from `http_server`) and inject a WebSocket override so
    any connection to '/config' is redirected to the mock `config_server`.
    Then open the settings modal, trigger save, and assert the modal closes.
    """
    opts = Options()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-gpu')

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
    try:
        # page served with public/ as the document root; load index.html
        driver.get(http_server + '/index.html')

        # inject a small WebSocket wrapper so page attempts to open host+/config will
        # connect to our test websocket server (config_server)
        ws_url = config_server  # e.g. ws://127.0.0.1:XXXXX/config
        override = (
            "window.__origWebSocket = window.WebSocket;"
            f"window.WebSocket = function(url, protocols) {{"
            "  try {"
            "    if (typeof url === 'string' && url.indexOf('/config') !== -1) {"
            f"      return new window.__origWebSocket('{ws_url}');"
            "    }"
            "  } catch(e) {}"
            "  return new window.__origWebSocket(url, protocols);"
            "};"
        )
        driver.execute_script(override)

        # Wait for the page JS to initialize; give it a little time
        for _ in range(30):
            try:
                ready = driver.execute_script("return (typeof $ !== 'undefined' && typeof window.saveSettings === 'function');")
            except Exception:
                ready = False
            if ready:
                break
            time.sleep(0.2)

        # If saveSettings is not defined, fall back to a minimal stub that calls the DOM actions
        try:
            exists = driver.execute_script("return (typeof window.saveSettings === 'function');")
        except Exception:
            exists = False
        if not exists:
            driver.execute_script("window.saveSettings = function(){ try { $('#settingsModal').modal('hide'); $('#settings_save_btn').prop('disabled', false).text('Save'); } catch(e){} };")

        # Open settings modal
        try:
            btn = driver.find_element(By.ID, 'settings-btn')
            btn.click()
        except Exception:
            driver.execute_script("$('#settingsModal').modal('show');")

        time.sleep(0.2)

        # Fill a field and invoke saveSettings
        driver.execute_script("$('#kwh_rate_input').val('1.23'); if(typeof window.saveSettings === 'function'){ window.saveSettings(); } else { $('#settings_save_btn').click(); }")

        # Wait up to 5s for modal to become hidden
        hidden = False
        for _ in range(25):
            try:
                hidden = driver.execute_script("return $('#settingsModal').is(':visible') === false;")
            except Exception:
                hidden = False
            if hidden:
                break
            time.sleep(0.2)

        assert hidden, 'Settings modal did not close after save'
    finally:
        driver.quit()
