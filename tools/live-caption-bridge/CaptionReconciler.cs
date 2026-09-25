using System.Text.RegularExpressions;

internal sealed record CaptionSegment(string Text, string Snapshot, string Reason);

internal sealed class CaptionReconciler
{
    private static readonly Regex WordPattern = new(@"\S+", RegexOptions.Compiled);

    private readonly TimeSpan _stabilityWindow;
    private string _previousSnapshot = "";
    private DateTimeOffset _changedAt = DateTimeOffset.MinValue;
    private bool _emittedForCurrentSnapshot;
    private string _committedSnapshot = "";

    public CaptionReconciler(TimeSpan stabilityWindow)
    {
        _stabilityWindow = stabilityWindow;
    }

    public IReadOnlyList<CaptionSegment> Observe(string snapshot, DateTimeOffset now)
    {
        snapshot = Normalize(snapshot);
        if (string.IsNullOrEmpty(snapshot)) return Array.Empty<CaptionSegment>();

        var output = new List<CaptionSegment>();

        if (string.Equals(snapshot, _previousSnapshot, StringComparison.Ordinal))
        {
            if (!_emittedForCurrentSnapshot && now - _changedAt >= _stabilityWindow)
                AddStableSegment(output, _previousSnapshot, "stable");
            return output;
        }

        if (!string.IsNullOrEmpty(_previousSnapshot) &&
            !_emittedForCurrentSnapshot &&
            now - _changedAt >= _stabilityWindow)
        {
            AddStableSegment(output, _previousSnapshot, "stable-before-revision");
        }

        _previousSnapshot = snapshot;
        _changedAt = now;
        _emittedForCurrentSnapshot = false;
        return output;
    }

    public IReadOnlyList<CaptionSegment> Flush(DateTimeOffset now, string reason)
    {
        if (string.IsNullOrEmpty(_previousSnapshot) || _emittedForCurrentSnapshot)
            return Array.Empty<CaptionSegment>();

        if (now - _changedAt < _stabilityWindow)
            return Array.Empty<CaptionSegment>();

        var output = new List<CaptionSegment>();
        AddStableSegment(output, _previousSnapshot, reason);
        return output;
    }

    private void AddStableSegment(List<CaptionSegment> output, string snapshot, string reason)
    {
        var text = ExtractNovelText(_committedSnapshot, snapshot);

        if (!ShouldEmit(text))
        {
            _committedSnapshot = snapshot;
            _emittedForCurrentSnapshot = true;
            return;
        }

        output.Add(new CaptionSegment(text, snapshot, reason));
        _committedSnapshot = snapshot;
        _emittedForCurrentSnapshot = true;
    }

    private static bool ShouldEmit(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var words = WordPattern.Matches(text).Count;
        return words >= 2 || Regex.IsMatch(text.TrimEnd(), @"[.!?…]$");
    }

    private static string ExtractNovelText(string committed, string current)
    {
        committed = Normalize(committed);
        current = Normalize(current);

        if (string.IsNullOrEmpty(committed)) return current;
        if (string.Equals(committed, current, StringComparison.Ordinal)) return "";
        if (current.StartsWith(committed, StringComparison.Ordinal))
            return current[committed.Length..].TrimStart();
        if (committed.StartsWith(current, StringComparison.Ordinal)) return "";

        var committedWords = Tokenize(committed);
        var currentWords = Tokenize(current);
        var maxOverlap = Math.Min(10, Math.Min(committedWords.Length, currentWords.Length));

        for (var length = maxOverlap; length >= 3; length--)
        {
            var matches = true;
            for (var i = 0; i < length; i++)
            {
                if (!string.Equals(
                    committedWords[committedWords.Length - length + i],
                    currentWords[i],
                    StringComparison.OrdinalIgnoreCase))
                {
                    matches = false;
                    break;
                }
            }

            if (matches) return string.Join(" ", currentWords.Skip(length));
        }

        return current;
    }

    private static string[] Tokenize(string text)
        => WordPattern.Matches(Normalize(text)).Select(m => m.Value).ToArray();

    private static string Normalize(string value)
        => string.IsNullOrWhiteSpace(value) ? "" : Regex.Replace(value.Trim(), @"\s+", " ");
}
