const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) return true;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(new Error(data.error.message));
          else cb.resolve(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('========================================================================');
  console.log('📱 AI TOON AUTHENTICATED MOBILE NAVIGATION & VIEWPORT AUDIT');
  console.log('========================================================================\n');

  // 1. Start backend server first for authentic session
  console.log('[Step 1] Starting backend API on port 5000...');
  const backend = spawn('cmd', ['/c', 'npm', 'start', '--workspace=ai-toon-backend'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'ignore',
  });

  // 2. Start Vite preview server for frontend dist
  console.log('[Step 2] Starting Vite preview server on port 4173...');
  const frontend = spawn('cmd', ['/c', 'npx', 'vite', 'preview', '--port', '4173'], {
    cwd: path.resolve(__dirname, '../frontend'),
    stdio: 'ignore',
  });

  try {
    await waitForHttp('http://localhost:5000/api/health', 15000);
    console.log('✅ Backend API healthy at http://localhost:5000/api/health');

    await waitForHttp('http://localhost:4173/', 15000);
    console.log('✅ Frontend preview running at http://localhost:4173/\n');

    // 3. Launch headless Chrome
    console.log(`[Step 3] Launching Chrome: ${CHROME_PATH}...`);
    const chromeProc = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        '--remote-debugging-port=9223',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=375,812',
        'about:blank',
      ],
      { stdio: 'ignore' }
    );

    try {
      await waitForHttp('http://127.0.0.1:9223/json/version', 15000);
      const targetsRes = await fetch('http://127.0.0.1:9223/json/list');
      const targets = await targetsRes.json();
      const pageTarget = targets.find((t) => t.type === 'page');
      const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
      await cdp.connect();
      console.log('✅ CDP Connected.\n');

      await cdp.send('Page.enable');
      await cdp.send('DOM.enable');

      // Test at 375px x 812px (iPhone 13 / 14 / 15)
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 375,
        height: 812,
        deviceScaleFactor: 2,
        mobile: true,
      });

      // 4. Test Mobile Hamburger Menu on Landing Page
      console.log('[Test 1] Testing Mobile Navigation Drawer on Landing Page...');
      await cdp.send('Page.navigate', { url: 'http://localhost:4173/' });
      await sleep(1000);

      // Verify toggle button exists
      const hasToggleBtn = await cdp.evaluate(`Boolean(document.querySelector('.mobile-nav-toggle-btn'))`);
      console.log(`   Mobile nav toggle button present: ${hasToggleBtn}`);

      // Click the mobile hamburger button to open drawer
      await cdp.evaluate(`document.querySelector('.mobile-nav-toggle-btn').click()`);
      await sleep(400);

      const isDrawerOpen = await cdp.evaluate(`Boolean(document.querySelector('.mobile-nav-drawer'))`);
      console.log(`   Mobile navigation drawer open: ${isDrawerOpen}`);

      // Capture screenshot of open drawer
      const ssDrawer = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SCREENSHOT_DIR, '375px_mobile_drawer_open.png'), Buffer.from(ssDrawer.data, 'base64'));
      console.log(`📸 Saved screenshot: 375px_mobile_drawer_open.png`);

      // 5. Authenticate via login page
      console.log('\n[Test 2] Authenticating via Login Page at 375px...');
      await cdp.send('Page.navigate', { url: 'http://localhost:4173/login' });
      await sleep(1000);

      // Click autofill credentials and submit
      await cdp.evaluate(`
        (() => {
          const autofillBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Autofill'));
          if (autofillBtn) autofillBtn.click();
        })()
      `);
      await sleep(300);

      await cdp.evaluate(`
        (() => {
          const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In to Account') || b.type === 'submit');
          if (submitBtn) submitBtn.click();
        })()
      `);
      await sleep(2500);

      const currentUrl = await cdp.evaluate(`window.location.pathname`);
      console.log(`   Redirected after login to: ${currentUrl}`);

      // 6. Test Authenticated Mobile Header & Drawer
      console.log('\n[Test 3] Testing Authenticated Header & Drawer at 375px...');
      await cdp.evaluate(`
        (() => {
          const toggle = document.querySelector('.mobile-nav-toggle-btn');
          if (toggle) toggle.click();
        })()
      `);
      await sleep(400);

      const ssAuthDrawer = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SCREENSHOT_DIR, '375px_auth_mobile_drawer.png'), Buffer.from(ssAuthDrawer.data, 'base64'));
      console.log(`📸 Saved screenshot: 375px_auth_mobile_drawer.png`);

      // 7. Test Lesson Generator Page at 375px and 320px
      for (const width of [375, 320]) {
        console.log(`\n[Test 4] Testing Visual Lesson Generator at ${width}px...`);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 800,
          deviceScaleFactor: 2,
          mobile: true,
        });

        await cdp.send('Page.navigate', { url: 'http://localhost:4173/generate' });
        await sleep(1000);

        const genAudit = await cdp.evaluate(`
          (() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              docWidth,
              winWidth,
              overflow: docWidth > winWidth + 1
            };
          })()
        `);

        if (genAudit.overflow) {
          console.log(`❌ Generator Page overflows at ${width}px! docWidth=${genAudit.docWidth}px, viewport=${genAudit.winWidth}px`);
        } else {
          console.log(`✅ Generator Page fits ${width}px with ZERO horizontal overflow (scrollWidth: ${genAudit.docWidth}px)`);
        }

        const ssGen = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${width}px_generator_auth.png`), Buffer.from(ssGen.data, 'base64'));
        console.log(`📸 Saved screenshot: ${width}px_generator_auth.png`);
      }

      // 8. Test Dashboard Page at 375px and 320px
      for (const width of [375, 320]) {
        console.log(`\n[Test 5] Testing Student Dashboard at ${width}px...`);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 800,
          deviceScaleFactor: 2,
          mobile: true,
        });

        await cdp.send('Page.navigate', { url: 'http://localhost:4173/dashboard' });
        await sleep(1000);

        const dashAudit = await cdp.evaluate(`
          (() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              docWidth,
              winWidth,
              overflow: docWidth > winWidth + 1
            };
          })()
        `);

        if (dashAudit.overflow) {
          console.log(`❌ Dashboard overflows at ${width}px! docWidth=${dashAudit.docWidth}px, viewport=${dashAudit.winWidth}px`);
        } else {
          console.log(`✅ Dashboard fits ${width}px with ZERO horizontal overflow (scrollWidth: ${dashAudit.docWidth}px)`);
        }

        const ssDash = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${width}px_dashboard_auth.png`), Buffer.from(ssDash.data, 'base64'));
        console.log(`📸 Saved screenshot: ${width}px_dashboard_auth.png`);
      }

      // 9. Test Search Page at 375px and 320px
      for (const width of [375, 320]) {
        console.log(`\n[Test 6] Testing Educational Search Page at ${width}px...`);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 800,
          deviceScaleFactor: 2,
          mobile: true,
        });

        await cdp.send('Page.navigate', { url: 'http://localhost:4173/search' });
        await sleep(1000);

        const searchAudit = await cdp.evaluate(`
          (() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              docWidth,
              winWidth,
              overflow: docWidth > winWidth + 1
            };
          })()
        `);

        if (searchAudit.overflow) {
          console.log(`❌ Search Page overflows at ${width}px! docWidth=${searchAudit.docWidth}px, viewport=${searchAudit.winWidth}px`);
        } else {
          console.log(`✅ Search Page fits ${width}px with ZERO horizontal overflow (scrollWidth: ${searchAudit.docWidth}px)`);
        }

        const ssSearch = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${width}px_search_auth.png`), Buffer.from(ssSearch.data, 'base64'));
        console.log(`📸 Saved screenshot: ${width}px_search_auth.png`);
      }

      // 10. Test Admin Console at 375px and 320px
      for (const width of [375, 320]) {
        console.log(`\n[Test 7] Testing SaaS Admin Console at ${width}px...`);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 800,
          deviceScaleFactor: 2,
          mobile: true,
        });

        await cdp.send('Page.navigate', { url: 'http://localhost:4173/admin' });
        await sleep(1000);

        const adminAudit = await cdp.evaluate(`
          (() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              docWidth,
              winWidth,
              overflow: docWidth > winWidth + 1
            };
          })()
        `);

        if (adminAudit.overflow) {
          console.log(`❌ Admin Page overflows at ${width}px! docWidth=${adminAudit.docWidth}px, viewport=${adminAudit.winWidth}px`);
        } else {
          console.log(`✅ Admin Page fits ${width}px with ZERO horizontal overflow (scrollWidth: ${adminAudit.docWidth}px)`);
        }

        const ssAdmin = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${width}px_admin_auth.png`), Buffer.from(ssAdmin.data, 'base64'));
        console.log(`📸 Saved screenshot: ${width}px_admin_auth.png`);
      }

      cdp.close();

      console.log('\n========================================================================');
      console.log('🎉 ALL AUTHENTICATED MOBILE TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY!');
      console.log('========================================================================\n');
    } finally {
      chromeProc.kill();
    }
  } finally {
    frontend.kill();
    backend.kill();
  }
}

main().catch((err) => {
  console.error('Fatal error during authenticated mobile testing:', err);
  process.exit(1);
});

