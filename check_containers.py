from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import time

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
try:
    driver.get('http://127.0.0.1:8081')
    time.sleep(1)
    elems = driver.find_elements(By.CSS_SELECTOR, 'div.container')
    print('container count:', len(elems))
    for i,e in enumerate(elems):
        print(i, e.get_attribute('id'), e.get_attribute('class')[:200])
finally:
    driver.quit()
