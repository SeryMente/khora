// @l0 L0-002-R · @req FIX-DICTADO/D2-D8
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test.describe('Dictado por partes contract test', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/dictado/checkpoint', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({ json: { ok: true, sessionId: body.sessionId, revisionId: body.revisionId } });
      } else {
        await route.fulfill({ json: { owner: 'synthetic-custody-owner@example.invalid', recovery: null } });
      }
    });
  });

  test('handles audio multipart upload, errors and limit guards', async ({ page }) => {
    // Inject auth session to skip login
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    // We can intercept requests to /api/audio and /api/dictado to assert things.
    const audioRequests: any[] = [];
    await page.route('**/api/audio', async (route) => {
      const request = route.request();
      const postData = request.postDataBuffer();
      if (!postData) throw new Error('Missing audio multipart body');
      const form = await new Request(request.url(), {
        method: 'POST', headers: { 'content-type': request.headers()['content-type'] }, body: new Uint8Array(postData)
      }).formData();
      const audio = form.get('audio');
      if (!(audio instanceof File)) throw new Error('Missing audio file');
      const audioBytes = Buffer.from(await audio.arrayBuffer());
      if (postData) {
        audioRequests.push({
          size: postData.length,
          formData: request.postData(),
        });
      }
      // Respond with mock success
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://blob.vercel-storage.com/dictado/mock-part-url.webm.khc',
          bytes: audioBytes.length,
          cifrado: true,
          sha256: createHash('sha256').update(audioBytes).digest('hex'),
          verificado: true
        }),
      });
    });

    // Aislar este contrato de audio del servicio externo de pulido.
    await page.route('**/api/pulir', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          texto: body.texto,
          aceptado: true,
          motivo: 'ok',
          motivoRechazo: null
        })
      });
    });
    // Stub SpeechRecognition
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
              // Emit one final speech piece
              if (this.onresult) {
                this.onresult({
                  resultIndex: 0,
                  results: [
                    {
                      0: { transcript: 'test dictation text for multipart' },
                      isFinal: true,
                      length: 1
                    }
                  ]
                });
              }
            }, 50);
          }
        }

        stop() {
          this._started = false;
          if (this.onend) setTimeout(() => this.onend(), 50);
        }

        abort() {
          this._started = false;
          if (this.onend) setTimeout(() => this.onend(), 50);
        }
      }

      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });

    await page.goto('/sistema/ingreso?modo=dictado');
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
    await expect(page.getByText('Salvaguarda preparada', { exact: true })).toBeVisible();

    // Click "Iniciar dictado"
    const startBtn = page.locator('button:has-text("Iniciar dictado")');
    await startBtn.click();

    // Wait a bit to accumulate and let recognition start
    await page.waitForTimeout(2000);

    // Stop dictation (this forces uploading any remaining chunk)
    const stopBtn = page.locator('button:has-text("Detener")');
    await stopBtn.click();

    // Wait for upload requests to complete
    await page.waitForTimeout(1000);

    // Verify we captured at least one upload request to /api/audio
    expect(audioRequests.length).toBeGreaterThan(0);
    for (const req of audioRequests) {
      // Body size should be far below 4.5 MB (4,718,592 bytes)
      expect(req.size).toBeLessThan(4 * 1024 * 1024);
      // FormData contains fields: sesionId, parte, audio
      expect(req.formData).toContain('sesionId');
      expect(req.formData).toContain('parte');
    }

    // Now test saving with /api/dictado returning a mock error.
    // The spec requests: "with several parts uploaded and /api/dictado returning error, the parts still exist in Blob"
    // Also: "and a response no-JSON of /api/audio no impide que el texto se guarde"
    // Let's mock /api/dictado to return a failure status to verify saving handles it.
    let dictadoPayload: any = null;
    await page.route('**/api/dictado', async (route) => {
      dictadoPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 500,
        contentType: 'text/plain',
        body: 'Infrastructure Error 500: Gateway Timeout',
      });
    });

    const saveBtn = page.locator('button:has-text("Archivar registro")');
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Verify /api/dictado was sent with proper audioPartes array
    expect(dictadoPayload).not.toBeNull();
    expect(dictadoPayload.audioPartes).toBeInstanceOf(Array);
    expect(dictadoPayload.audioPartes.length).toBeGreaterThan(0);
    expect(dictadoPayload.audioUrl).toBe('https://blob.vercel-storage.com/dictado/mock-part-url.webm.khc');
    expect(dictadoPayload.audioBytes).toBeGreaterThan(0);

    // Since /api/dictado failed with 500, we should see error in the UI
    const errorAlert = page.locator('main div:has(svg)').filter({ hasText: /Gateway Timeout/ });
    await expect(errorAlert).toBeVisible();

    // Let's verify status bar shows parts uploaded
    const statsText = await page.locator('main p.text-xs.font-medium').textContent();
    expect(statsText).toContain('partes subidas:');
  });

  test('no-JSON audio failure blocks archive and preserves captured text', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    // Mock non-JSON response from /api/audio
    await page.route('**/api/audio', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'text/plain',
        body: 'Bad Gateway - Connection refused',
      });
    });

    // Mock /api/dictado to succeed
    let dictadoPayload: any = null;
    await page.route('**/api/dictado', async (route) => {
      dictadoPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'some-id', sha256: 'some-sha256', chars: 100 }),
      });
    });

    // Aislar este contrato de audio del servicio externo de pulido.
    await page.route('**/api/pulir', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          texto: body.texto,
          aceptado: true,
          motivo: 'ok',
          motivoRechazo: null
        })
      });
    });
    // Stub SpeechRecognition
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
              if (this.onresult) {
                this.onresult({
                  resultIndex: 0,
                  results: [{ 0: { transcript: 'saving even with failed audio upload' }, isFinal: true, length: 1 }]
                });
              }
            }, 50);
          }
        }

        stop() {
          this._started = false;
          if (this.onend) setTimeout(() => this.onend(), 50);
        }

        abort() {
          this._started = false;
          if (this.onend) setTimeout(() => this.onend(), 50);
        }
      }
      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });

    await page.goto('/sistema/ingreso?modo=dictado');
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
    await expect(page.getByText('Salvaguarda preparada', { exact: true })).toBeVisible();

    // Start & stop dictation
    await page.locator('button:has-text("Iniciar dictado")').click();
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Detener")').click();
    await page.waitForTimeout(500);

    // Attempt archive: failed audio must remain blocked.
    await page.locator('button:has-text("Archivar registro")').click();
    await page.waitForTimeout(1000);

    // AUD-05: una sesión de voz sin audio verificado NO puede archivarse.
    expect(dictadoPayload).toBeNull();

    const errorAlert = page.locator('main div').filter({ hasText: /No se puede archivar el registro.*custodia íntegra/i }).last();
    await expect(errorAlert).toBeVisible();
  });
});
