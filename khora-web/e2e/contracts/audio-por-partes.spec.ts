// @l0 L0-002-R · @req FIX-DICTADO/D2-D8
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { prepareIngresoContract } from '../helpers/ingreso-contract';

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
  test.beforeEach(async ({ page }) => { await prepareIngresoContract(page); });

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
    const errorAlert = page.locator('[data-ui-id="ingreso.msg-error"]').filter({ hasText: /Gateway Timeout/ });
    await expect(errorAlert).toBeVisible();

    // Let's verify status bar shows parts uploaded
    await page.getByRole('button', { name: 'Más opciones de captura' }).click();
    await page.locator('summary').filter({ hasText: 'Detalles de la captura' }).click();
    await expect(page.locator('[data-ui-id="ingreso.stats"]')).toContainText(/Audio: [1-9]\d* partes verificadas/);
  });

  test('archive retries transient audio failures before sending the verified manifest', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('khora_auth_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    });

    let audioAttempts = 0;
    let archiveCalls = 0;
    let archivedPayload: any = null;
    await page.route('**/api/audio', async (route) => {
      audioAttempts += 1;
      if (audioAttempts <= 3) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'audio_temporarily_unavailable', detail: 'Temporary storage failure' }),
        });
        return;
      }
      const request = route.request();
      const postData = request.postDataBuffer();
      if (!postData) throw new Error('Missing audio multipart body');
      const form = await new Request(request.url(), {
        method: 'POST', headers: { 'content-type': request.headers()['content-type'] }, body: new Uint8Array(postData)
      }).formData();
      const audio = form.get('audio');
      if (!(audio instanceof File)) throw new Error('Missing audio file');
      const audioBytes = Buffer.from(await audio.arrayBuffer());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://blob.vercel-storage.com/dictado/retry-success-part.webm.khc',
          bytes: audioBytes.length,
          cifrado: true,
          sha256: createHash('sha256').update(audioBytes).digest('hex'),
          verificado: true,
        }),
      });
    });

    await page.route('**/api/pulir', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texto: body.texto, aceptado: true, motivo: 'ok', motivoRechazo: null }),
      });
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
          if (this.onstart) setTimeout(() => {
            if (!this._started) return;
            this.onstart();
            this.onresult?.({
              resultIndex: 0,
              results: [{ 0: { transcript: 'retry audio and archive safely' }, isFinal: true, length: 1 }],
            });
          }, 50);
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

    await page.route('**/api/dictado', async (route) => {
      archiveCalls += 1;
      archivedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'retry-verified-archive',
          sessionId: archivedPayload.sessionId,
          sha256: 'b'.repeat(64),
          chars: archivedPayload.texto.length,
          estado: 'archivado',
        }),
      });
    });

    await page.goto('/sistema/ingreso?modo=dictado');
    await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
    await expect(page.getByText('Salvaguarda preparada', { exact: true })).toBeVisible();

    await page.locator('button:has-text("Iniciar dictado")').click();
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Detener")').click();

    await expect(page.locator('[data-ui-id="ingreso.custodia-status"]'))
      .toContainText('1 parte(s) con confirmación remota pendiente', { timeout: 15000 });
    await expect.poll(() => audioAttempts, { timeout: 15000 }).toBe(3);
    expect(archiveCalls).toBe(0);

    const retryArchive=page.getByRole('button', { name: 'Reintentar y archivar' });
    await expect(retryArchive).toBeVisible();
    // Simula dos activaciones inmediatas por la misma captura: solo puede archivarse una vez.
    await retryArchive.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect(page.locator('[data-ui-id="ingreso.btn-archivar"]'))
      .toContainText('Captura archivada', { timeout: 15000 });

    expect(audioAttempts).toBe(4);
    expect(archiveCalls).toBe(1);
    expect(archivedPayload).not.toBeNull();
    expect(archivedPayload.audioPartes).toHaveLength(1);
    expect(archivedPayload.audioPartes[0].verificado).toBe(true);
    expect(archivedPayload.audioPartes[0].sha256).toMatch(/^[a-f0-9]{64}$/i);
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

    await expect(page.locator('[data-ui-id="ingreso.textarea"]')).toHaveValue(/saving even with failed audio upload/i);
    await expect(page.getByRole('button', { name: 'Reintentar y archivar' })).toBeVisible();
    const errorAlert = page.locator('[data-ui-id="ingreso.msg-error"]').filter({ hasText: /No se puede archivar el registro.*custodia íntegra/i });
    await expect(errorAlert).toBeVisible();

    // A persistent storage failure must keep the server archive endpoint closed after explicit retry too.
    await page.getByRole('button', { name: 'Reintentar y archivar' }).click();
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    expect(dictadoPayload).toBeNull();
    await expect(page.locator('[data-ui-id="ingreso.textarea"]')).toHaveValue(/saving even with failed audio upload/i);
  });
});
