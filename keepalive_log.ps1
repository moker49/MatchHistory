$log = "C:\Dev\MatchHistory\keepalive.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    $response = Invoke-WebRequest `
        -Uri "https://lol.efren.org/api/wake" `
        -UseBasicParsing `
        -TimeoutSec 10

    "$timestamp OK Status=$($response.StatusCode) Length=$($response.RawContentLength)" |
        Out-File $log -Append
}
catch {
    "$timestamp ERROR $($_.Exception.Message)" |
        Out-File $log -Append
}