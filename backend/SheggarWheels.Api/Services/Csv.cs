// CSV builder — same RFC-quoting as the original export routes (FR-27):
// every cell is double-quoted; inner quotes are doubled.
namespace SheggarWheels.Api.Services;

public static class Csv
{
    public static string Cell(object? value)
    {
        var s = value switch
        {
            null => "",
            string str => str,
            DateTime dt => dt.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"),
            _ => value.ToString() ?? "",
        };
        return "\"" + s.Replace("\"", "\"\"") + "\"";
    }

    public static string Build(IEnumerable<string[]> rows) =>
        string.Join("\n", rows.Select(r => string.Join(",", r)));
}
