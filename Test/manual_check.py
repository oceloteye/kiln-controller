from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=1400,900')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

results = []
for path in ('/picoreflow/index.html','/picoreflow/state.html'):
    url = 'http://127.0.0.1:8081' + path
    driver.get(url)
    time.sleep(0.8)
    count = driver.execute_script("return document.querySelectorAll('.container').length;")
    shot = path.strip('/').replace('/','_') + '.png'
    driver.save_screenshot(shot)
    print(f"{path} -> containers={count}, screenshot={shot}")
    results.append((path, count, shot))

driver.quit()

for p,c,s in results:
    print(p, c, s)
