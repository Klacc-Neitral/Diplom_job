Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    node .\tests-frontend\run-tests.mjs
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
