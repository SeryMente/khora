// @l0 L0-002-R · @req FIX-DICTADO/D1
import { test, expect } from '@playwright/test';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test.describe('Dictado sin perdida anti-regresion guard', () => {
  test('does not lose text during paused dictation sequence', async ({ page }) => {
    // Inject auth session to skip login
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    // Inject SpeechRecognition double
    await page.addInitScript(() => {
      class MockSpeechRecognition {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onstart: any;
        onresult: any;
        onerror: any;
        onend: any;
        _started: boolean;

        constructor() {
          this.continuous = true;
          this.interimResults = true;
          this.lang = 'es-MX';
          this.onstart = null;
          this.onresult = null;
          this.onerror = null;
          this.onend = null;
          this._started = false;
        }

        start() {
          if (this._started) return;
          this._started = true;
          if (this.onstart) {
            setTimeout(() => {
              if (!this._started) return;
              this.onstart();
              this._runSequence();
            }, 50);
          }
        }

        stop() {
          this._started = false;
          if (this.onend) {
            setTimeout(() => {
              this.onend();
            }, 50);
          }
        }

        abort() {
          this._started = false;
          if (this.onend) {
            setTimeout(() => {
              this.onend();
            }, 50);
          }
        }

        _runSequence() {
          const sequence = [
            { text: 'hola', delay: 0 },
            { text: 'solo', delay: 3000 },
            { text: 'digo', delay: 300 },
            { text: 'digo', delay: 300 }
          ];

          let currentDelay = 0;
          const results: any[] = [];

          sequence.forEach((item, index) => {
            currentDelay += item.delay;
            setTimeout(() => {
              if (!this._started) return;

              const resultItem = {
                0: { transcript: item.text },
                isFinal: true,
                length: 1
              };
              results.push(resultItem);

              if (this.onresult) {
                const event = {
                  resultIndex: index,
                  results: results
                };
                this.onresult(event);
              }
            }, currentDelay + 100);
          });
        }
      }

      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });

    await page.goto('/sistema/dictado');

    // Verify page has loaded
    const mainHeader = page.locator('h1');
    await expect(mainHeader).toBeVisible();

    // Click "Iniciar dictado"
    const startBtn = page.locator('button:has-text("Iniciar dictado")');
    await startBtn.click();

    // Wait for the full speech sequence to be emitted and settle
    // The sequence takes 0 + 3000 + 300 + 300 = 3600 ms, plus some padding.
    // 5000 ms is a safe threshold to let everything emit.
    await page.waitForTimeout(5000);

    // Click "Detener" to finalize and commit the pending block
    const stopBtn = page.locator('button:has-text("Detener")');
    await stopBtn.click();

    // Read the transcription panel text
    const transcriptionArea = page.locator('main div.p-4.min-h-\\[240px\\]').first();
    await expect(transcriptionArea).toBeVisible();

    const textContent = await transcriptionArea.textContent() || '';
    const normalizedText = textContent.toLowerCase();

    console.log('TRANSCRIPTION PANEL CONTENT:', textContent);

    // Assertions
    // 1. Must contain "solo"
    expect(normalizedText).toContain('solo');

    // 2. Must contain "digo" exactly TWO times
    const matches = normalizedText.match(/\bdigo\b/g);
    const count = matches ? matches.length : 0;
    expect(count).toBe(2);

    // 3. Must contain all four words emitted (hola, solo, digo, digo)
    expect(normalizedText).toContain('hola');
    expect(normalizedText).toContain('solo');
  });
});
