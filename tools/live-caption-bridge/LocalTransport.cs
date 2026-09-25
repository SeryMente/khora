using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

internal sealed class LocalTransport : IDisposable
{
    private const int DefaultPort = 8788;
    private const int MaxPayloadBytes = 1024 * 1024;

    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _cts = new();
    private readonly ConcurrentDictionary<Guid, ClientConnection> _clients = new();
    private readonly int _port;
    private bool _started;

    public LocalTransport(int port = DefaultPort)
    {
        _port = port;
        _listener = new TcpListener(IPAddress.Loopback, _port);
    }

    public string WebSocketUrl => $"ws://127.0.0.1:{_port}/";

    public void Start()
    {
        if (_started) return;
        _listener.Start();
        _started = true;
        _ = Task.Run(AcceptLoopAsync);
        _ = Task.Run(HeartbeatLoopAsync);
    }

    public void Publish(object value)
    {
        if (!_started) return;
        var json = JsonSerializer.Serialize(value);
        foreach (var client in _clients.Values) client.TryQueue(json);
    }

    private async Task AcceptLoopAsync()
    {
        while (!_cts.IsCancellationRequested)
        {
            TcpClient? tcpClient = null;
            try
            {
                tcpClient = await _listener.AcceptTcpClientAsync(_cts.Token);
                tcpClient.NoDelay = true;
                _ = Task.Run(() => HandleClientAsync(tcpClient), _cts.Token);
            }
            catch (OperationCanceledException) { break; }
            catch
            {
                tcpClient?.Dispose();
                if (!_cts.IsCancellationRequested)
                    await Task.Delay(250, _cts.Token);
            }
        }
    }

    private async Task HandleClientAsync(TcpClient tcpClient)
    {
        using (tcpClient)
        {
            var stream = tcpClient.GetStream();
            try
            {
                var request = await ReadHttpHeaderAsync(stream, _cts.Token);
                if (string.IsNullOrEmpty(request)) return;

                if (request.StartsWith("GET /health", StringComparison.OrdinalIgnoreCase))
                {
                    await SendHttpResponseAsync(
                        stream, 200, "application/json; charset=utf-8",
                        JsonSerializer.Serialize(new
                        {
                            service = "khora-live-caption",
                            transport = "websocket",
                            url = WebSocketUrl,
                            clients = _clients.Count,
                            timestamp = DateTimeOffset.UtcNow
                        }),
                        _cts.Token);
                    return;
                }

                var key = GetHeader(request, "Sec-WebSocket-Key");
                if (string.IsNullOrWhiteSpace(key))
                {
                    await SendHttpResponseAsync(
                        stream, 400, "text/plain; charset=utf-8",
                        "WebSocket upgrade required.",
                        _cts.Token);
                    return;
                }

                var accept = Convert.ToBase64String(
                    SHA1.HashData(Encoding.ASCII.GetBytes(
                        key.Trim() + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));

                var response =
                    "HTTP/1.1 101 Switching Protocols\r\n" +
                    "Upgrade: websocket\r\n" +
                    "Connection: Upgrade\r\n" +
                    $"Sec-WebSocket-Accept: {accept}\r\n\r\n";

                await stream.WriteAsync(Encoding.ASCII.GetBytes(response), _cts.Token);
                await stream.FlushAsync(_cts.Token);

                var connection = new ClientConnection(stream, _cts.Token);
                var id = Guid.NewGuid();

                if (!_clients.TryAdd(id, connection)) return;

                connection.TryQueue(JsonSerializer.Serialize(new
                {
                    type = "bridge.connected",
                    protocol = "khora-live-caption.v1",
                    transport = "websocket",
                    timestamp = DateTimeOffset.UtcNow
                }));

                try
                {
                    while (!_cts.IsCancellationRequested)
                    {
                        if (!await connection.ReceiveAsync()) break;
                    }
                }
                finally
                {
                    _clients.TryRemove(id, out _);
                    await connection.DisposeAsync();
                }
            }
            catch { }
        }
    }

    private async Task HeartbeatLoopAsync()
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        try
        {
            while (await timer.WaitForNextTickAsync(_cts.Token))
            {
                Publish(new
                {
                    type = "bridge.heartbeat",
                    protocol = "khora-live-caption.v1",
                    timestamp = DateTimeOffset.UtcNow,
                    clients = _clients.Count
                });
            }
        }
        catch (OperationCanceledException) { }
    }

    private static async Task<string> ReadHttpHeaderAsync(Stream stream, CancellationToken token)
    {
        var bytes = new List<byte>(4096);
        while (bytes.Count < 64 * 1024)
        {
            var buffer = new byte[1];
            var read = await stream.ReadAsync(buffer, token);
            if (read == 0) return "";

            bytes.Add(buffer[0]);
            var n = bytes.Count;
            if (n >= 4 &&
                bytes[n - 4] == 13 && bytes[n - 3] == 10 &&
                bytes[n - 2] == 13 && bytes[n - 1] == 10)
                return Encoding.UTF8.GetString(bytes.ToArray());
        }

        return "";
    }

    private static string GetHeader(string request, string name)
    {
        foreach (var line in request.Split("\r\n", StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = line.IndexOf(':');
            if (separator <= 0) continue;
            if (line[..separator].Trim().Equals(name, StringComparison.OrdinalIgnoreCase))
                return line[(separator + 1)..].Trim();
        }
        return "";
    }

    private static async Task SendHttpResponseAsync(
        Stream stream, int status, string contentType, string body, CancellationToken token)
    {
        var bodyBytes = Encoding.UTF8.GetBytes(body);
        var statusText = status == 200 ? "OK" : status == 400 ? "Bad Request" : "Error";
        var response =
            $"HTTP/1.1 {status} {statusText}\r\n" +
            "Connection: close\r\n" +
            $"Content-Type: {contentType}\r\n" +
            $"Content-Length: {bodyBytes.Length}\r\n\r\n";

        await stream.WriteAsync(Encoding.ASCII.GetBytes(response), token);
        await stream.WriteAsync(bodyBytes, token);
        await stream.FlushAsync(token);
    }

    public void Dispose()
    {
        if (!_started) return;
        _cts.Cancel();
        try { _listener.Stop(); } catch { }

        foreach (var client in _clients.Values) _ = client.DisposeAsync();
        _clients.Clear();
        _started = false;
    }

    private sealed class ClientConnection
    {
        private readonly Stream _stream;
        private readonly CancellationToken _token;
        private readonly SemaphoreSlim _sendLock = new(1, 1);

        public ClientConnection(Stream stream, CancellationToken token)
        {
            _stream = stream;
            _token = token;
        }

        public void TryQueue(string json) => _ = SendTextAsync(json);

        private async Task SendTextAsync(string json)
        {
            var payload = Encoding.UTF8.GetBytes(json);
            if (payload.Length > MaxPayloadBytes) return;

            try
            {
                await _sendLock.WaitAsync(_token);
                try
                {
                    await WriteFrameAsync(_stream, 0x1, payload, _token);
                    await _stream.FlushAsync(_token);
                }
                finally { _sendLock.Release(); }
            }
            catch { }
        }

        public async Task<bool> ReceiveAsync()
        {
            var header = await ReadExactlyAsync(_stream, 2, _token);
            if (header is null) return false;

            var opcode = header[0] & 0x0F;
            var masked = (header[1] & 0x80) != 0;
            var lengthCode = header[1] & 0x7F;

            if (opcode == 0x8)
            {
                await WriteFrameAsync(_stream, 0x8, Array.Empty<byte>(), _token);
                await _stream.FlushAsync(_token);
                return false;
            }

            ulong length = lengthCode switch
            {
                <= 125 => (ulong)lengthCode,
                126 => ReadUInt16BigEndian(await ReadExactlyAsync(_stream, 2, _token)),
                127 => ReadUInt64BigEndian(await ReadExactlyAsync(_stream, 8, _token)),
                _ => 0
            };

            if (length > MaxPayloadBytes) return false;

            byte[] mask = Array.Empty<byte>();
            if (masked)
            {
                var readMask = await ReadExactlyAsync(_stream, 4, _token);
                if (readMask is null) return false;
                mask = readMask;
            }

            var payload = length == 0
                ? Array.Empty<byte>()
                : await ReadExactlyAsync(_stream, checked((int)length), _token);

            if (payload is null) return false;

            if (masked)
                for (var i = 0; i < payload.Length; i++)
                    payload[i] = (byte)(payload[i] ^ mask[i % 4]);

            if (opcode == 0x9)
            {
                await WriteFrameAsync(_stream, 0xA, payload, _token);
                await _stream.FlushAsync(_token);
            }

            return true;
        }

        public ValueTask DisposeAsync()
        {
            try { _stream.Close(); } catch { }
            _sendLock.Dispose();
            return ValueTask.CompletedTask;
        }

        private static async Task WriteFrameAsync(
            Stream stream, byte opcode, byte[] payload, CancellationToken token)
        {
            var header = new List<byte> { (byte)(0x80 | (opcode & 0x0F)) };

            switch (payload.Length)
            {
                case <= 125:
                    header.Add((byte)payload.Length);
                    break;
                case <= ushort.MaxValue:
                    header.Add(126);
                    header.Add((byte)(payload.Length >> 8));
                    header.Add((byte)payload.Length);
                    break;
                default:
                    header.Add(127);
                    var length = (ulong)payload.Length;
                    for (var i = 7; i >= 0; i--) header.Add((byte)(length >> (8 * i)));
                    break;
            }

            await stream.WriteAsync(header.ToArray(), token);
            if (payload.Length > 0) await stream.WriteAsync(payload, token);
        }

        private static async Task<byte[]?> ReadExactlyAsync(
            Stream stream, int count, CancellationToken token)
        {
            var buffer = new byte[count];
            var offset = 0;

            while (offset < count)
            {
                var read = await stream.ReadAsync(buffer.AsMemory(offset, count - offset), token);
                if (read == 0) return null;
                offset += read;
            }

            return buffer;
        }

        private static ushort ReadUInt16BigEndian(byte[]? bytes)
        {
            if (bytes is null || bytes.Length != 2) throw new IOException("Unexpected WebSocket frame length.");
            return (ushort)((bytes[0] << 8) | bytes[1]);
        }

        private static ulong ReadUInt64BigEndian(byte[]? bytes)
        {
            if (bytes is null || bytes.Length != 8) throw new IOException("Unexpected WebSocket frame length.");
            ulong value = 0;
            foreach (var b in bytes) value = (value << 8) | b;
            return value;
        }
    }
}
