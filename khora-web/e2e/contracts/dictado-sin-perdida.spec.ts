// @l0 L0-002-R · @req FIX-DICTADO/D1 · @req FIX-DICTADO/D12
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
    expect(normalizedText).toContain('solo');

    const matches = normalizedText.match(/\bdigo\b/g);
    const count = matches ? matches.length : 0;
    expect(count).toBe(2);

    expect(normalizedText).toContain('hola');
    expect(normalizedText).toContain('solo');
  });

  test('prevents loss when authoritative backend returns truncated response (@req FIX-DICTADO/D9)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    await page.addInitScript(() => {
      class MockSpeechRecognition {
        continuous = true;
        interimResults = true;
        lang = 'es-MX';
        onstart: any = null;
        onresult: any = null;
        onerror: any = null;
        onend: any = null;
        _started = false;

        start() {
          if (this._started) return;
          this._started = true;
          if (this.onstart) {
            setTimeout(() => {
              if (!this._started) return;
              this.onstart();
              const event = {
                resultIndex: 0,
                results: [
                  { 0: { transcript: 'hola esto es una prueba importante de dictado sin pérdida' }, isFinal: true, length: 1 }
                ]
              };
              if (this.onresult) this.onresult(event);
            }, 50);
          }
        }

        stop() { this._started = false; if (this.onend) setTimeout(() => this.onend(), 50); }
        abort() { this._started = false; if (this.onend) setTimeout(() => this.onend(), 50); }
      }

      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });

    // Mock API /api/transcribir to return a truncated response with exito: true and full shape
    await page.route('/api/transcribir', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exito: true,
          textoAutoritativo: 'hola esto es una prueba',
          textoFinal: 'hola esto es una prueba importante de dictado sin pérdida',
          reconciliado: false,
          perdidaDetectada: true,
          estadoTranscripcion: 'parcial',
          partesFallidas: [1],
          motivoReconciliacion: 'Pérdida de contenido detectada en Whisper. Se conservó la previsualización ASR en vivo.',
          modelo: 'whisper-large-v3'
        }),
      });
    });

    await page.goto('/sistema/dictado');
    await expect(page.locator('h1')).toBeVisible();

    const startBtn = page.locator('button:has-text("Iniciar dictado")');
    await startBtn.click();
    await page.waitForTimeout(1000);

    const stopBtn = page.locator('button:has-text("Detener")');
    await stopBtn.click();

    const transcriptionArea = page.locator('main div.p-4.min-h-\\[240px\\]').first();
    await expect(transcriptionArea).toBeVisible();

    const textContent = await transcriptionArea.textContent() || '';
    const normalizedText = textContent.toLowerCase();

    // Verify content was preserved despite truncated Whisper response
    expect(normalizedText).toContain('dictado sin pérdida');
    expect(normalizedText).toContain('importante');

    // Verify UI reflects status badge or warning message
    await expect(page.locator('text=Posible omisión detectada')).toBeVisible();
  });
});
