try {
    Invoke-WebRequest `
        -Uri "https://lol.efren.org/api/wake" `
        -UseBasicParsing `
        -TimeoutSec 10
}
catch {
}