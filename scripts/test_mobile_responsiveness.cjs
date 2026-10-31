const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BREAKPOINTS = [
  { name: 'Small Phone (320px)', width: 320, height: 600 },
  { name: 'Small Phone (360px)', width: 360, height: 740 },
  { name: 'Standard Phone (375px)', width: 375, height: 812 },
  { name: 'Standard Phone (390px)', width: 390, height: 844 },
  { name: 'Large Phone (414px)', width: 414, height: 896 },
  { name: 'Large Phone (430px)', width: 430, height: 932 },
  { name: 'Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1024px)', width: 1024, height: 768 },
];

const PAGES = [
  { name: 'Landing Page', path: '/' },
  { name: 'Login Page', path: '/login' },
  { name: 'Sign Up Page', path: '/signup' },
  { name: 'Lesson Generator', path: '/generate' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Search Page', path: '/search' },
];

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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('========================================================================');
  console.log('📱 AI TOON MOBILE RESPONSIVENESS & BREAKPOINT VERIFICATION AUDIT');
  console.log('========================================================================\n');

  // 1. Start static preview server for frontend dist
  console.log('[Step 1] Starting Vite preview server on port 4173...');
  const server = spawn('cmd', ['/c', 'npx', 'vite', 'preview', '--port', '4173'], {
    cwd: path.resolve(__dirname, '../frontend'),
    stdio: 'ignore',
  });

  try {
    await waitForHttp('http://localhost:4173/', 15000);
    console.log('✅ Vite preview server running at http://localhost:4173/\n');

    // 2. Launch headless Chrome with remote debugging
    console.log(`[Step 2] Launching headless browser: ${CHROME_PATH}...`);
    const chromeProc = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        '--remote-debugging-port=9222',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1200,800',
        'about:blank',
      ],
      { stdio: 'ignore' }
    );

    try {
      await waitForHttp('http://127.0.0.1:9222/json/version', 15000);
      console.log('✅ Headless browser debugging endpoint ready.\n');

      // Fetch target page
      const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
      const targets = await targetsRes.json();
      const pageTarget = targets.find((t) => t.type === 'page');
      if (!pageTarget) throw new Error('No browser page target available');

      const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
      await cdp.connect();
      console.log('✅ Connected to Chrome DevTools Protocol.\n');

      await cdp.send('Page.enable');
      await cdp.send('DOM.enable');

      let totalTests = 0;
      let passedTests = 0;
      const issues = [];

      for (const bp of BREAKPOINTS) {
        console.log(`\n------------------------------------------------------------`);
        console.log(`🔍 Testing Breakpoint: ${bp.name} (${bp.width}px x ${bp.height}px)`);
        console.log(`------------------------------------------------------------`);

        // Set device metrics
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: bp.width,
          height: bp.height,
          deviceScaleFactor: 1,
          mobile: bp.width < 768,
        });

        for (const page of PAGES) {
          totalTests++;
          const targetUrl = `http://localhost:4173${page.path}`;

          // Navigate
          await cdp.send('Page.navigate', { url: targetUrl });
          await sleep(600); // Allow styles and layout to settle

          // Audit horizontal overflow and layout
          const evalResult = await cdp.send('Runtime.evaluate', {
            expression: `
              (() => {
                const docWidth = document.documentElement.scrollWidth;
                const winWidth = window.innerWidth;
                const hasHorizontalScroll = docWidth > winWidth + 1;

                // Find any elements exceeding viewport right edge
                const allElements = Array.from(document.querySelectorAll('*'));
                const overflowing = allElements.filter(el => {
                  const rect = el.getBoundingClientRect();
                  return rect.right > winWidth + 2 && rect.width > 0 && rect.height > 0;
                }).map(el => ({
                  tagName: el.tagName.toLowerCase(),
                  className: (el.className && typeof el.className === 'string') ? el.className.trim() : '',
                  right: Math.round(el.getBoundingClientRect().right),
                  width: Math.round(el.getBoundingClientRect().width)
                })).slice(0, 3); // top 3 culprits

                // Check mobile navigation menu button visibility
                const navToggle = document.querySelector('.mobile-nav-toggle-btn');
                const isNavToggleVisible = navToggle ? window.getComputedStyle(navToggle).display !== 'none' : false;

                return {
                  docWidth,
                  winWidth,
                  hasHorizontalScroll,
                  overflowing,
                  isNavToggleVisible
                };
              })()
            `,
            returnByValue: true,
          });

          const audit = evalResult.result.value;

          // Capture screenshot for first page at each breakpoint
          if (page.path === '/' || page.path === '/generate') {
            const ssResult = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const sanitizedName = `${bp.width}px_${page.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            fs.writeFileSync(path.join(SCREENSHOT_DIR, sanitizedName), Buffer.from(ssResult.data, 'base64'));
          }

          if (audit.hasHorizontalScroll) {
            console.log(`❌ [FAIL] ${page.name}: Horizontal overflow detected! docWidth=${audit.docWidth}px, viewport=${audit.winWidth}px`);
            if (audit.overflowing.length > 0) {
              console.log('   Culprits:', JSON.stringify(audit.overflowing));
            }
            issues.push({ bp: bp.name, page: page.name, culprits: audit.overflowing });
          } else {
            console.log(`✅ [PASS] ${page.name}: Perfectly fits ${audit.winWidth}px (scrollWidth: ${audit.docWidth}px, no clipping)`);
            passedTests++;
          }

          // Verify hamburger toggle at mobile vs desktop
          if (bp.width < 768) {
            if (!audit.isNavToggleVisible) {
              console.log(`⚠️  [NOTE] Mobile nav toggle button should be visible at ${bp.width}px`);
            }
          }
        }
      }

      cdp.close();

      console.log('\n========================================================================');
      console.log(`📊 RESPONSIVENESS AUDIT SUMMARY: ${passedTests} / ${totalTests} Passed`);
      console.log('========================================================================');

      if (issues.length > 0) {
        console.log(`\n❌ Encountered ${issues.length} overflow issue(s):`);
        issues.forEach((iss, idx) => {
          console.log(`  ${idx + 1}. ${iss.bp} on ${iss.page}:`, iss.culprits);
        });
        process.exitCode = 1;
      } else {
        console.log('\n🎉 ALL BREAKPOINTS AND PAGES PASSED WITH 0 HORIZONTAL SCROLL!');
        console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
      }
    } finally {
      chromeProc.kill();
    }
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error('Fatal error during responsiveness testing:', err);
  process.exit(1);
});

