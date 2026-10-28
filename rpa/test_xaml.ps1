param([string]$path = "E:\RPA 1\rpa\UiPath_Workflow_Files\Main.xaml")
try {
    $xml = [xml](Get-Content -Path $path -Raw)
    Write-Host "SUCCESS: $path is valid XML. Root element: $($xml.DocumentElement.Name)"
} catch {
    Write-Error "ERROR: Failed to parse XML: $_"
    exit 1
}
